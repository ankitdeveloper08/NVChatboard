// import express from "express";
// import cors from "cors";
// import fetch from "node-fetch";

// const app = express();
// const PORT = 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Proxy route to LM Studio
// app.post("/api/generate", async (req, res) => {
//   try {
//     const { messages } = req.body;

//     // Send request to LM Studio API
//     const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: "google/gemma-3-1b",
//         messages,
//         temperature: 0.7,
//         max_tokens: 512,
//       }),
//     });

//     const data = await response.json();

//     if (!data || !data.choices || !data.choices[0]?.message?.content) {
//       console.error("⚠️ Invalid response from LM Studio:", data);
//       return res.status(500).json({ error: "Invalid response from LM Studio" });
//     }

//     // Extract and return message content
//     res.json({
//       reply: data.choices[0].message.content,
//     });
//   } catch (error) {
//     console.error("❌ Error contacting local LM Studio:", error);
//     res.status(500).json({ error: "Error contacting LM Studio" });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`✅ Proxy running on http://localhost:${PORT}`);
// });
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load user profile
let userProfile = {};
try {
  const raw = fs.readFileSync("./profile.json", "utf-8");
  userProfile = JSON.parse(raw);
  console.log("📘 Loaded user profile:", userProfile.name);
} catch (err) {
  console.warn("⚠️ No profile.json found or invalid JSON, continuing without profile.");
}

// Proxy route to LM Studio
app.post("/api/generate", async (req, res) => {
  try {
    const { messages } = req.body;

    // Construct system message using profile.json
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI assistant. You know the following about the user:
Name: ${userProfile.name || "Unknown"}
Role: ${userProfile.role || "Not specified"}
Skills: ${(userProfile.skills || []).join(", ")}
Experience: ${userProfile.experience || "Not specified"}
Company: ${userProfile.company || "Not specified"}
Location: ${userProfile.location || "Not specified"}
Goals: ${(userProfile.goals || []).join(", ")}

Always personalize responses based on this profile.`,
    };

    // Merge system message with user messages
    const fullMessages = [systemMessage, ...messages];

    // Send request to LM Studio API
    const response = await fetch("http://127.0.0.1:1234/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-3-1b",
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]?.message?.content) {
      console.error("⚠️ Invalid response from LM Studio:", data);
      return res.status(500).json({ error: "Invalid response from LM Studio" });
    }

    // Extract and return message content
    res.json({
      reply: data.choices[0].message.content,
    });
  } catch (error) {
    console.error("❌ Error contacting local LM Studio:", error);
    res.status(500).json({ error: "Error contacting LM Studio" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running on http://localhost:${PORT}`);
});
