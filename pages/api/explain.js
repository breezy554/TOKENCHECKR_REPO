export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { flags, address, eli5 } = req.body;
  if (!flags || !Array.isArray(flags)) {
    return res.status(400).json({ error: 'Invalid flags format' });
  }

  const prompt = eli5
    ? `Explain the following smart contract red flags in a very simple way, like I'm 5 years old. Token address: ${address}\nFlags:\n${flags.map(f => f.text).join('\n')}`
    : `You're a smart contract auditor. Explain the following red flags clearly. Token address: ${address}\nFlags:\n${flags.map(f => f.text).join('\n')}`;

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
      explanation: data.response,
      score: Math.max(100 - flags.length * 15, 0)
    });
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ error: 'AI failed' });
  }
}
