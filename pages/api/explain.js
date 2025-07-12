export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { flags, address, eli5, profile } = req.body;

  if (!flags || !Array.isArray(flags)) {
    return res.status(400).json({ error: 'Invalid flags format' });
  }

  let stylePrompt = '';

  if (eli5) {
    stylePrompt = "Explain these smart contract flags like I'm 5 years old.";
  } else {
    switch (profile) {
      case 'developer':
        stylePrompt = "You are a Solidity developer. Explain each flag using code-focused language.";
        break;
      case 'beginner':
        stylePrompt = "You are helping a beginner. Explain the flags in simple and friendly language.";
        break;
      case 'auditor':
      default:
        stylePrompt = "You are a senior smart contract auditor. Explain the following flags with technical clarity.";
        break;
    }
  }

  const prompt = `${stylePrompt}\nToken: ${address}\n\nFlags:\n${flags.map(f => f.text).join('\n')}`;

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
