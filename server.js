
import 'dotenv/config';
import express from 'express';
import Groq from 'groq-sdk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '1mb' })); 
app.use(express.static(__dirname));
const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ai = apiKey ? new Groq({ apiKey }) : null;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function isTemporaryError(err) {
  const status = Number(err?.status ?? err?.statusCode);
  return [408, 429, 500, 502, 503, 504].includes(status);
}

async function generateWithRetry(options) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await ai.chat.completions.create(options);
    } catch (err) {
      if (!isTemporaryError(err) || attempt === 2) {
        throw err;
      }

      const delay = 1500 * (2 ** attempt);
      console.log(
        'Groq temporary error; retry ' +
        (attempt + 1) + '/2 in ' + delay + 'ms'
      );

      await sleep(delay);
    }
  }

  throw new Error('Groq request failed after retries.');
}

const systemInstruction =
  'You are AEVOR AI, a helpful, friendly personal AI assistant. ' +
  'Your creator and owner is Syed Ali Adnan. ' +
  'You are an independent personal AI project. ' +
  'If someone asks who created you, say: "You were created by Syed Ali Adnan." ' +
  'If someone asks who owns you, say: "Your owner is Syed Ali Adnan." ' +
  'If someone asks your name, say: "My name is AEVOR AI." ' +

  'LANGUAGE RULES: ' +
  'Reply in the same language and writing style as the latest user message. ' +
  'For English, reply in English. For Roman Urdu, use Roman Urdu with English letters. ' +
  'For Urdu script, reply in Urdu script. If languages are mixed, use the dominant language. ' +
  'Never switch languages unless requested. Keep language natural and easy to understand. ' +

  'Give accurate, helpful, practical answers. Explain technical topics step by step when needed. ' +
  'Be honest about uncertainty and never invent facts. ' +
  'You are AEVOR AI, not ChatGPT or OpenAI.';

app.post('/api/chat', async (req, res) => {
  if (!ai) {
    return res.status(503).json({
      error: 'Groq API key missing. Check your environment variables.'
    });
  }

  const incoming = Array.isArray(req.body?.messages)
    ? req.body.messages
    : [];

  const safeMessages = incoming
    .filter(m =>
      m &&
      ['user', 'assistant'].includes(m.role) &&
      typeof m.content === 'string'
    )
    .slice(-24)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 8000)
    }));

  if (!safeMessages.length) {
    return res.status(400).json({
      error: 'Please type a message first.'
    });
  }

  try {
    const response = await generateWithRetry({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...safeMessages
      ],
      temperature: 0.7,
      max_tokens: 2048
    });

    return res.json({
      reply:
        response.choices?.[0]?.message?.content ||
        'Please try asking in a different way.'
    });
  } catch (err) {
    const status = Number(err?.status ?? err?.statusCode);

    console.error('Groq API error:', err?.message || err);

    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return res.status(503).json({
        error: 'The AI service is busy. Please try again in a few seconds.'
      });
    }

    return res.status(502).json({
      error: 'Groq request failed. Check your API key, model name, and usage limits.'
    });
  }
});

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`AEVOR AI is running on port ${port}`);
});
