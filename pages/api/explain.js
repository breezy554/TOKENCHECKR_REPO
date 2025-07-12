export default async function handler(req, res) {
  const { flags } = req.body;

  const prompt = `Analyze the following token flags and explain potential risks in detail:\n\n${flags.join(', ')}`;

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
    res.status(200).json({ explanation: data.response.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
