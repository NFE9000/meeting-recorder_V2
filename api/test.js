export default function handler(request) {
  return new Response(JSON.stringify({
    status: "API funktioniert",
    method: request.method,
    openai_key: process.env.OPENAI_API_KEY ? "vorhanden" : "fehlt",
    notion_key: process.env.NOTION_API_KEY ? "vorhanden" : "fehlt",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
