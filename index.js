import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const app = express();

// MCP सर्व्हर सेटअप
const server = new Server(
  {
    name: "kie-ai-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// क्लॉडसाठी टूल्सची यादी (Kie.ai मॉडेल्स, Nemotron आणि Gemini सह)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_kie_models",
        description: "Kie.ai वरील सर्व उपलब्ध AI मॉडेल्सची यादी मिळवा",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// टूल एक्झिक्युट करताना काय होईल
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_kie_models") {
    // यामध्ये Nemotron आणि Gemini मॉडेल्स समाविष्ट केले आहेत
    const kieModels = [
      "Kie-Claude-Model",
      "Kie-GPT-Model",
      "Kie-DeepSeek-Model",
      "Nemotron AI Model",
      "Gemini AI Model",
      "Kie-Custom-Engine"
    ];

    return {
      content: [
        {
          type: "text",
          text: `Kie.ai वर उपलब्ध मॉडेल्स:\n- ${kieModels.join("\n- ")}`,
        },
      ],
    };
  }

  throw new Error("Tool not found");
});

// Express द्वारे SSE ट्रान्सपोर्ट हँडल करणे
let transport;

app.get("/mcp", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active transport session");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Kie MCP Server running on port ${PORT}`);
});
