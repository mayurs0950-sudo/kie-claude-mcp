import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const app = express();

// सर्व्हर सेटअप
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

// मॉडेल्सची यादी
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_kie_models",
        description: "Kie.ai आणि इतर उपलब्ध AI मॉडेल्सची यादी मिळवा",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_kie_models") {
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
          text: `उपलब्ध मॉडेल्स:\n- ${kieModels.join("\n- ")}`,
        },
      ],
    };
  }

  throw new Error("Tool not found");
});

// SSE ट्रान्सपोर्ट आणि रूट्स
let transport;

app.get("/mcp", async (req, res) => {
  try {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
  } catch (error) {
    console.error("SSE Connection Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active transport session");
  }
});

// मुख्य होम पेज तपासण्यासाठी
app.get("/", (req, res) => {
  res.send("Kie AI MCP Server is running successfully!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
