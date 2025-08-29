export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');

  // ---------- /api/transcribe?endpoint=transcribe ----------
  if (endpoint === 'transcribe') {
    const formData = await request.formData();
    if (!formData.get('model')) formData.append('model', 'gpt-4o-mini-transcribe');

    let r;
    try {
      r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData
      });
    } catch (e) {
      return json({ error: 'OpenAI transcription fetch failed', details: String(e) }, 502);
    }

    const txt = await r.text();
    if (!r.ok) {
      return json({ error: 'OpenAI transcription failed', status: r.status, details: txt }, 502);
    }
    // txt ist bereits JSON-String (von OpenAI), daher direkt durchreichen
    return new Response(txt, { status: 200, headers: CORS_HEADERS });
  }

  // ---------- /api/transcribe?endpoint=summary ----------
  if (endpoint === 'summary') {
    const { transcript } = await request.json();

    let r;
    try {
      r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' }, // erzwingt valides JSON im content
          messages: [
            {
              role: 'user',
              content: `Erstelle eine strukturierte Meeting-Zusammenfassung mit:
1) 2–3 Sätzen Kurzfassung
2) 5–10 stichpunktartigen Details
3) Action Items als Liste

Antworte NUR als JSON mit den Keys:
{
  "short_summary": "…",
  "detailed_summary": ["…","…"],
  "action_items": ["…","…"]
}

Transkript:
${transcript}`
            }
          ]
        })
      });
    } catch (e) {
      return json({ error: 'OpenAI summary fetch failed', details: String(e) }, 502);
    }

    const txt = await r.text();
    if (!r.ok) {
      return json({ error: 'OpenAI summary failed', status: r.status, details: txt }, 502);
    }
    // txt ist das Chat Completions JSON (inkl. choices[0].message.content als JSON-String)
    return new Response(txt, { status: 200, headers: CORS_HEADERS });
  }

  // ---------- Fallback ----------
  return json({ error: 'Invalid endpoint' }, 400);
}
