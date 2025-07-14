export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { flags, address, eli5, profile } = req.body;

  if (!Array.isArray(flags) || !address) {
    return res.status(400).json({ error: 'Missing address or flags' });
  }

  // 🔍 Safely format flags whether they're strings or objects
  const formattedFlags = flags
    .map(f => typeof f === 'string' ? f : f?.text || '')
    .filter(f => f.length > 0);

  if (formattedFlags.length === 0) {
    return res.status(400).json({ error: 'No valid flags to explain.' });
  }

  // 🧠 Prompt style selection
  let stylePrompt = '';
  if (eli5) {
    stylePrompt = "Explain the following smart contract flags like I'm 5 years old.";
  } else {
    switch (profile) {
      case 'developer':
        stylePrompt = "You're a Solidity developer. Explain these flags technically.";
        break;
      case 'beginner':
        stylePrompt = "You're a friendly crypto guide. Explain these flags simply.";
        break;
      default:
        stylePrompt = "You're a smart contract auditor. Explain these issues thoroughly.";
        break;
    }
  }

  const prompt = `${stylePrompt}\n\nToken Address: ${address}\n\nFlags:\n${formattedFlags.join('\n')}`;
  console.log("🧠 Prompt sent to Ollama:\n", prompt);

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tinyllama',
        prompt,
        stream: false
      })
    });

    const raw = await response.text();
    console.log('🔍 Raw AI Response:', raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('❌ Failed to parse AI JSON:', err);
      return res.status(500).json({ error: 'AI returned invalid JSON.' });
    }

    const explanation = data?.response?.trim();
    const score = Math.max(100 - formattedFlags.length * 15, 0);

    if (!explanation || explanation.length < 3) {
      return res.status(200).json({
        explanation: '❌ No explanation returned.',
        score
      });
    }

    return res.status(200).json({
      explanation,
      score
    });

  } catch (err) {
    console.error('❌ AI Server Error:', err);
    return res.status(500).json({ error: 'AI request failed.' });
  }
}
