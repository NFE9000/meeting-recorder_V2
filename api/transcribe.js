export const config = { runtime: 'edge' };
export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    if (endpoint === 'transcribe') {
      const formData = await request.formData();
      formData.append('model', 'gpt-4o-mini-transcribe');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders
      });
    }

    if (endpoint === 'summary') {
      const { transcript } = await request.json();
      
      const prompt = `Du bist ein Meeting-Assistent. Analysiere das folgende Transkript und erstelle:

1. Eine kurze Zusammenfassung in 2-3 Sätzen
2. Ein ausführlicheres Summary in Bullet Points
3. Action Items als Liste

Das Meeting kann auf Deutsch, Englisch oder gemischt sein. Antworte in der Hauptsprache des Meetings.

Transkript:
${transcript}

Antworte in folgendem JSON Format:
{
    "short_summary": "2-3 Sätze Zusammenfassung",
    "detailed_summary": ["Bullet Point 1", "Bullet Point 2", "..."],
    "action_items": ["Action Item 1", "Action Item 2", "..."]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`Summary failed: ${response.statusText}`);
      }

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
