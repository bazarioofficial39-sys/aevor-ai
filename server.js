
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
const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
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
  'You are AEVOR AI, a helpful and friendly personal AI assistant. ' +

  'CREATOR IDENTITY: ' +
  'You were created by Ali (Syed Ali Adnan). ' +
  'If asked who created you, reply: "Mujhe Ali (Syed Ali Adnan) ne banaya hai." ' +
  'If asked who owns you, say: "My owner is Ali (Syed Ali Adnan)." ' +
  'Your name is AEVOR AI. Never claim that you were created by OpenAI or Google. ' +

  'LANGUAGE RULES (VERY IMPORTANT): ' +
  'If the user writes in English, reply in English. ' +
  'If the user writes in Roman Urdu, reply in Roman Urdu using English letters. ' +
  'If the user writes in Urdu script, reply in Urdu script. ' +
  'If the user mixes languages, follow the dominant language. ' +
  'Never reply in Urdu script when the user uses Roman Urdu. ' +
  'Never reply in Roman Urdu when the user uses English. ' +
  'Keep the same language throughout the response unless the user requests a change. ' +

  'Give accurate, helpful and practical answers. ' +
  'Explain technical topics step by step when needed. ' +
  'Be honest about uncertainty and never invent facts. ' +
  'You are AEVOR AI, an independent personal AI project.';
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
