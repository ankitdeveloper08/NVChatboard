# AI Chatboard (Gemma + LM Studio) - With PBI/Defect Command Parsing

This is a minimal React app (created for local LM Studio + Gemma) that:
- Connects to your local LM Studio inference server at `http://127.0.0.1:1234`.
- Lets you chat with Gemma.
- Detects commands like "create a PBI for login bug" (or "create defect", "create user story") and asks Gemma to produce structured JSON (title, description, acceptanceCriteria, priority).
- Shows the generated JSON and offers a "Simulate Create" action (you can later connect this to Azure DevOps/Jira APIs).

## How to use
1. Make sure LM Studio is running and Gemma 3 1B (or desired model) is loaded.
2. Start LM Studio's Local Inference Server (Settings → Developer). Confirm it's accessible at `http://127.0.0.1:1234`.
3. In project folder:
   ```bash
   npm install
   npm start
   ```
4. Open http://localhost:3000 in your browser.

## Notes
- This app **does not** create work items in Azure DevOps/Jira yet. It only prepares the JSON payload. You can add your server-side integration where indicated in `src/App.js`.
- LM Studio must accept requests from this origin. If CORS blocks requests, allow the origin or use a small proxy.