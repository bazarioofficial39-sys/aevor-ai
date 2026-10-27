ALI AI CHAT — SETUP GUIDE (Windows 10)

What is included?
- Responsive ChatGPT-style web chat UI
- Real AI connection through OpenAI API (requires your own API key and API access)
- Recent chats stored in this browser's localStorage
- Roman Urdu and English-friendly assistant instructions
- API key stays on the server in a .env file, not in browser JavaScript

IMPORTANT
This is a project starter, not a hosted website and not a compiled app. It will not produce real AI answers until you set an API key and run the server. API usage may cost money; check current API pricing and usage limits before using it.

STEP 1 — Install Node.js
1. Visit https://nodejs.org/ and install the current LTS version for Windows.
2. Close and reopen Command Prompt after installation.
3. Check:
   node -v
   npm -v

STEP 2 — Open the project folder
1. Extract the ZIP.
2. Open the extracted AliAI_Chat folder.
3. Click the folder address bar, type cmd, and press Enter.

STEP 3 — Install dependencies
Run:
   npm install

STEP 4 — Add your API key privately
1. Copy .env.example and name the copy .env (make sure it is not .env.txt).
2. Open .env in Notepad.
3. Replace put_your_api_key_here with your own API key.
4. Save it. Do not send your key to anyone or paste it into public HTML/JavaScript.
5. If your account cannot access the default model, change OPENAI_MODEL in .env to a model available to your API account.

Get started with the official API documentation:
https://developers.openai.com/api/docs/quickstart

STEP 5 — Start Ali AI
In the same Command Prompt, run:
   npm start

Open this address in your browser:
   http://localhost:3000

Keep the Command Prompt window open while using the local site. To stop it, press Ctrl+C.

NOTES
- API account/billing/usage limits are separate from a ChatGPT subscription.
- Chat history is stored only in the current browser on this device. It is not synced to another device.
- This starter has no login or multi-user security, so keep it for local testing. Do not expose it publicly as-is.
- Never publish the .env file or API key.
