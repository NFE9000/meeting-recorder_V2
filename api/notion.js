export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { dbId, title, content, status } = await req.json();

  const NOTION_API_KEY = process.env.NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    return new Response("Missing NOTION_API_KEY env var", { status: 500 });
  }
  if (!dbId) {
    return new Response("Missing dbId in request body", { status: 400 });
  }
  if (!title) {
    return new Response("Missing title in request body", { status: 400 });
  }

  // Hilfsfunktion zum Splitten großer Inhalte in Paragraph-Blöcke
  function splitTextIntoBlocks(text, chunkSize = 1900) {
    const safeText = text || "";
    const blocks = [];
    for (let i = 0; i < safeText.length; i += chunkSize) {
      blocks.push(safeText.slice(i, i + chunkSize));
    }
    return blocks.length ? blocks : [""];
  }

  const contentBlocks = splitTextIntoBlocks(content);

  const children = contentBlocks.map(chunk => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: chunk } }]
    }
  }));

  const notionRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        ...(status ? { Status: { select: { name: status } } } : {})
      },
      children
    })
  });

  if (!notionRes.ok) {
    const err = await notionRes.text();
    return new Response(`Notion API Fehler: ${err}`, { status: notionRes.status });
  }

  const data = await notionRes.json();
  return new Response(JSON.stringify(data), { status: 200 });
}
