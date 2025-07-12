import { pipeline } from '@xenova/transformers';

let generator = null;

export async function explainWithLocalAI(flags) {
  console.log('⚙️ explainWithLocalAI called');

  if (!generator) {
    try {
      console.log('🧠 Loading model: phi2');
      generator = await pipeline('text-generation', 'Xenova/phi2', { quantized: true });
    } catch (e) {
      console.warn('⚠️ Phi-2 not supported, falling back to GPT2');
      generator = await pipeline('text-generation', 'Xenova/gpt2');
    }
  }

  const prompt = `
You are a smart contract security auditor.

Here are some detected risk flags:
${flags.map(f => `- ${f}`).join('\n')}

1. Explain these risks clearly for a crypto investor.
2. Then, give a risk score from 0 (safe) to 100 (extremely risky).

Format:
Explanation:
...

Score: <number>
`.trim();

  const output = await generator(prompt, {
    max_new_tokens: 200,
    temperature: 0.7,
    top_k: 50,
    top_p: 0.9,
  });

  const raw = output?.[0]?.generated_text || '';
  const scoreMatch = raw.match(/Score:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null;

  const explanation = raw
    .replace(prompt, '')
    .replace(/Score:\s*\d+/i, '')
    .trim();

  return { explanation, score };
}
