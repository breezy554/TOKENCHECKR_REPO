export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { flags, address, eli5, profile } = req.body;
  if (!flags || !Array.isArray(flags)) {
    return res.status(400).json({ error: 'Invalid flags format' });
  }

  // 🔐 Safe string format: handles both strings & { text: "..." }
  const formattedFlags = flags.map(f => typeof f === 'string' ? f : f?.text || '').filter(Boolean);
  if (formattedFlags.length === 0) {
    return res.status(400).json({ error: 'No valid flags provided.' });
  }

  // 🧠 Prompt Style Logic
  let stylePrompt = '';
  if (eli5) {
    stylePrompt = "Explain the following smart contract risks like I’m 5 years old.";
  } else {
    switch (profile) {
      case 'developer':
        stylePrompt = "You're a Solidity developer. Explain the issues from a technical perspective.";
        break;
      case 'beginner':
        stylePrompt = "You're helping a crypto beginner. Explain the issues simply and clearly.";
        break;
      case 'auditor':
      default:
        stylePrompt = "You're a smart contract auditor. Explain the flags with clear reasoning.";
        break;
    }
  }

  const prompt = `${stylePrompt}\n\nToken Address: ${address}\n\nFlags:\n${formattedFlags.join('\n')}`;
  console.log("🧠 Prompt sent to LLM:\n", prompt);

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',  // adjust to your installed model
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    const explanation = data?.response?.trim();

    return res.status(200).json({
      explanation: explanation || '❌ No explanation returned.',
      score: Math.max(100 - formattedFlags.length * 15, 0)
    });
  } catch (err) {
    console.error('❌ AI Server Error:', err);
    return res.status(500).json({ error: 'AI service failed.' });
  }
}
