export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { transcript, summary, meetingTitle, meetingDate } = await req.json();

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

  // Hilfsfunktion zum Splitten
 function splitTextIntoBlocks(text, chunkSize = 1900) {
  const safeText = text || ""; // falls undefined oder null
  const blocks = [];
  for (let i = 0; i < safeText.length; i += chunkSize) {
    blocks.push(safeText.slice(i, i + chunkSize));
  }
  return blocks.length ? blocks : [""];
}


  const transcriptBlocks = splitTextIntoBlocks(transcript);

  const children = [];

  // Summary-Block
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "Summary" } }]
    }
  });
  children.push({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: summary } }]
    }
  });

  // Transcript-Blocks
  children.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: "Transcript" } }]
    }
  });
  transcriptBlocks.forEach(chunk => {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: chunk } }]
      }
    });
  });

  const notionRes = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        Name: {
          title: [{ text: { content: meetingTitle } }]
        },
        Date: {
          date: { start: meetingDate }
        },
        Status: {
          select: { name: "Done" }
        }
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
