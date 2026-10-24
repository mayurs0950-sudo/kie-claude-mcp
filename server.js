import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const app = express();
app.use(express.json({ limit: '1mb' }));
const PORT = Number(process.env.PORT || 3000);
const KIE_API_KEY = process.env.KIE_API_KEY;
const CONNECTOR_TOKEN = process.env.CONNECTOR_TOKEN;
const KIE_BASE = 'https://api.kie.ai/anthropic';

function tokenMatches(header) {
  const a = Buffer.from(header || '');
  const b = Buffer.from(`Bearer ${CONNECTOR_TOKEN}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.get('/', (_req, res) => res.status(200).send('KIE.ai Claude MCP bridge is running. MCP endpoint: /mcp'));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'kie-claude-remote-mcp' }));

function makeServer() {
  const server = new McpServer({ name: 'kie-ai-models', version: '1.0.0' });

  server.tool('kie_list_models', 'List the chat models KIE.ai currently exposes through its Anthropic-compatible API. This is a live list; not every model in the broader KIE market is available on this endpoint.', {}, async () => {
    const response = await fetch(`${KIE_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${KIE_API_KEY}` }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`KIE model-list request failed (${response.status}): ${body.slice(0, 1200)}`);
    return { content: [{ type: 'text', text: body }] };
  });

  server.tool('kie_chat', 'Send a text prompt to a KIE.ai model that is listed by kie_list_models. Uses KIE credits. Do not send passwords, secrets, or sensitive personal information.', {
    model: z.string().min(1).describe('Exact model ID returned by kie_list_models'),
    prompt: z.string().min(1).max(30000).describe('The prompt to send to the model'),
    system: z.string().max(10000).optional().describe('Optional system instruction'),
    max_tokens: z.number().int().min(1).max(8192).optional().describe('Maximum output tokens; default 1024')
  }, async ({ model, prompt, system, max_tokens }) => {
    const messages = [{ role: 'user', content: prompt }];
    const payload = { model, max_tokens: max_tokens || 1024, messages };
    if (system) payload.system = system;
    const response = await fetch(`${KIE_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`KIE chat request failed (${response.status}): ${body.slice(0, 1800)}`);
    let parsed;
    try { parsed = JSON.parse(body); } catch { return { content: [{ type: 'text', text: body }] }; }
    const text = Array.isArray(parsed.content)
      ? parsed.content.filter(x => x.type === 'text').map(x => x.text).join('\n')
      : body;
    return { content: [{ type: 'text', text: text || JSON.stringify(parsed) }], structuredContent: parsed };
  });

  return server;
}

app.post('/mcp', async (req, res) => {
  if (!KIE_API_KEY || !CONNECTOR_TOKEN) {
    return res.status(500).json({ error: 'Server is not configured. Set KIE_API_KEY and CONNECTOR_TOKEN environment variables.' });
  }
  if (!tokenMatches(req.get('authorization'))) return res.status(401).json({ error: 'Unauthorized' });

  const server = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'MCP request failed' });
  }
});

app.get('/mcp', (_req, res) => res.status(405).send('Use POST for MCP requests.'));
app.delete('/mcp', (_req, res) => res.status(405).send('Stateless MCP endpoint; DELETE not supported.'));

app.listen(PORT, '0.0.0.0', () => console.log(`KIE Claude MCP bridge listening on ${PORT}`));
