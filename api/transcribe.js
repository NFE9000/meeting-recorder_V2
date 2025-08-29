export const config = { runtime: 'edge' };

export default async function handler(request) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    if (endpoint === 'transcribe') {
      const formData = await request.formData();
      // wichtig: Model mitgeben
      if (!formData.get('model')) formData.append('model', 'gpt-4o-mini-transcribe');

      const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: formData
      });

      const txt = await r.text(); // immer Text lesen, damit wir Fehler sehen
      if (!r.ok) {
        return new Response(JSON.stringify({ error: 'OpenAI transcription failed', status: r.status, details: txt }), {
          status: 502,
          headers: cors
        });
      }
      // bei Erfolg ist txt JSON
      return new Response(txt, { status: 200, headers: cors });
    }

    if (endpoint === 'summary') {
  const { transcript } = await request.json();

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' }, // <- zwingt valides JSON
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

  const txt = await r.text();
  if (!r.ok) {
    return new Response(JSON.stringify({ error: 'OpenAI summary failed', status: r.status, details: txt }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Antwort der OpenAI API (Chat Completions JSON) unverändert durchreichen
  return new Response(txt, { status: 200, headers: { 'Content-Type': 'application/json' } });
};


      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });

      const txt = await r.text();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: 'OpenAI summary failed', status: r.status, details: txt }), {
          status: 502,
          headers: cors
        });
      }
      return new Response(txt, { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), { status: 400, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unhandled server error', details: String(err) }), {
      status: 500,
      headers: cors
    });
  }
}
