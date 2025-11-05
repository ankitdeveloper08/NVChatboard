import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import { Readable } from "stream";

// 🧩 New imports for RAG
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import fs from "fs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 5000;

const OPENROUTER_API_KEY = "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";
const DEFAULT_MODEL = "meta-llama/llama-3-8b-instruct";

// ============================
// 🔹 Existing Streaming Chat Route
// ============================
app.post("/v1/chat/completions", async (req, res) => {
  const { model, messages } = req.body;
  console.log("📩 Incoming stream request:", { model, messages });

  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      console.error("❌ OpenRouter returned error:", text);
      res.write(`data: ${JSON.stringify({ error: { message: text } })}\n\n`);
      res.end();
      return;
    }

    const readable =
      typeof response.body.getReader === "function"
        ? Readable.fromWeb(response.body)
        : response.body;

    readable.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      for (const line of lines) {
        if (line.startsWith("data:")) {
          res.write(`${line}\n\n`);
        }
      }
    });

    readable.on("end", () => {
      res.write("data: [DONE]\n\n");
      res.end();
    });

    readable.on("error", (err) => {
      console.error("❌ Stream error:", err.message);
      if (!res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: { message: err.message } })}\n\n`
        );
        res.end();
      }
    });
  } catch (err) {
    console.error("❌ Exception:", err.message);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
      res.end();
    }
  }
});

// ============================
// 🧠 New RAG (Retrieval-Augmented Generation)
// ============================

let vectorStore;

// Step 1️⃣: Load & embed local documents
async function initializeRAG() {
  console.log("🔄 Initializing RAG system...");

  const filePath = "./documents/sample.txt"; // put your text file here
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ No local document found, creating sample...");
    fs.writeFileSync(
      filePath,
      "This is a sample local document. Replace this file with your own knowledge base."
    );
  }

  const text = fs.readFileSync(filePath, "utf8");
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500 });
  const docs = await splitter.createDocuments([text]);

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY || OPENROUTER_API_KEY,
  });

  vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    collectionName: "local_rag_data",
  });

  console.log("✅ RAG initialized with embedded local data.");
}
initializeRAG();

// Step 2️⃣: Create /rag/ask endpoint
app.post("/rag/ask", async (req, res) => {
  try {
    const { query } = req.body;
    if (!vectorStore) return res.status(500).json({ error: "RAG not ready yet." });

    // Retrieve relevant context
    const results = await vectorStore.similaritySearch(query, 3);
    const context = results.map((r) => r.pageContent).join("\n");

    console.log("📄 Retrieved context:", context);

    // Use OpenRouter for answer generation
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that answers based on provided context.",
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${query}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || "No answer generated.";

    res.json({ answer });
  } catch (error) {
    console.error("❌ RAG error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
