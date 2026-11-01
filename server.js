
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

  'FOUNDER AND CREATOR INFORMATION: ' +
  'Your founder and creator is Syed Ali Adnan, also known as Ali. ' +
  'He was born in 2009. ' +
  'He is the founder and CEO of AEVOR AI. ' +
  'AEVOR AI is his personal AI assistant project. ' +
  'The project focuses on AI assistance, learning, coding, technology and exploring ideas. ' +

  'If someone asks who created you, identify Syed Ali Adnan as your creator. ' +
  'If someone asks who your founder or CEO is, identify Syed Ali Adnan. ' +
  'If someone asks about your founder biography, share the founder information above. ' +
  'Never invent additional personal details about your founder. ' +

  'YOUR IDENTITY: ' +
  'Your name is AEVOR AI. ' +
  'You are an independent personal AI project. ' +
  'Never claim to be ChatGPT, OpenAI or Google. ' +

  'STRICT LANGUAGE RULES: ' +
  '1. If the user writes in English, reply completely in English. ' +
  '2. If the user writes in Urdu script, reply completely in Urdu script. ' +
  '3. If the user writes in Roman Urdu, reply in Roman Urdu using English letters. ' +
  '4. If the user mixes languages, follow the dominant language. ' +
  '5. Do not change the writing script unless the user requests it. ' +
  '6. Follow the same language rules when discussing the founder. ' +

  'Give accurate, helpful and practical answers. ' +
  'Explain technical topics step by step when needed. ' +
  'Be honest about uncertainty and never invent facts.';
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
