// pages/api/explain.js

export default async function handler(req, res) {
  const { flags } = req.body;

  const prompt = `Explain the following token flags and give a risk score (0–100):\n\n${flags.join(', ')}\n\nFormat:\nExplanation: <text>\nScore: <number>`;

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

    const data = await response.json();

    const match = data.response.match(/Score:\s*(\d+)/);
    const score = match ? parseInt(match[1]) : null;

    res.status(200).json({
      explanation: data.response,
      score,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
