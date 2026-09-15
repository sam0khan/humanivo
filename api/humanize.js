export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Please provide some text.' });
    return;
  }

  if (text.length > 8000) {
    res.status(400).json({ error: 'Text is too long. Try under 8000 characters.' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured yet. Missing GROQ_API_KEY.' });
    return;
  }

  const systemPrompt = `You rewrite text so it reads naturally, the way a thoughtful human would actually write it.

Rules:
- Preserve the original meaning, facts, and key details exactly.
- Vary sentence length — mix short punchy sentences with longer ones.
- Cut robotic transition words like "furthermore," "moreover," "additionally," "in conclusion."
- Use natural contractions where it fits the tone (it's, don't, that's).
- Avoid overly formal or symmetrical phrasing.
- Keep the same language, tone, and approximate length as the original.
- Do not add commentary, notes, or explanations — output only the rewritten text.`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.85,
        max_tokens: 2048
      })
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error('Groq API error:', errBody);
      res.status(502).json({ error: 'The rewrite service is temporarily unavailable. Try again in a moment.' });
      return;
    }

    const data = await groqRes.json();
    const result = data?.choices?.[0]?.message?.content?.trim();

    if (!result) {
      res.status(502).json({ error: 'No result came back. Try again.' });
      return;
    }

    res.status(200).json({ result });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
}
