export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { flags, address, eli5, profile } = req.body;
  if (!flags || !Array.isArray(flags)) return res.status(400).json({ error: 'Invalid flags format' });

  let stylePrompt = '';
  if (eli5) {
    stylePrompt = "Explain the following smart contract red flags like I'm 5 years old.";
  } else {
    switch (profile) {
      case 'developer':
        stylePrompt = "You're a Solidity developer. Explain each red flag in code terms.";
        break;
      case 'beginner':
        stylePrompt = "You're helping a crypto beginner. Explain these flags simply.";
        break;
      case 'auditor':
      default:
        stylePrompt = "You're a smart contract auditor. Give a clear, professional explanation.";
        break;
    }
  }

  const prompt = `${stylePrompt}\nToken Address: ${address}\n\nFlags:\n${flags.map(f => typeof f === 'string' ? f : f.text).join('\n')}`;

  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    return res.status(200).json({
      explanation: data.response || '❌ No explanation returned.',
      score: Math.max(100 - flags.length * 15, 0)
    });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ error: 'AI failed to respond' });
  }
}
