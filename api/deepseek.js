async function searchWeb(query) {
  const encoded = encodeURIComponent(query);

  // Try DDG Instant Answer API first (JSON, no scraping needed)
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(ddgUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LuminaBot/1.0)" },
      signal: AbortSignal.timeout(4000),
    });
    const data = await resp.json();
    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || "Answer",
        url: data.AbstractURL || "",
        snippet: data.AbstractText,
      });
    }
    if (data.Answer) {
      results.push({
        title: "Instant Answer",
        url: "",
        snippet: data.Answer,
      });
    }
    for (const topic of (data.RelatedTopics || []).slice(0, 4)) {
      if (topic.Text) {
        results.push({
          title: topic.FirstURL || "",
          url: topic.FirstURL || "",
          snippet: topic.Text,
        });
      }
    }

    if (results.length > 0) {
      console.log(`DDG API found ${results.length} results for: ${query}`);
      return results.slice(0, 6);
    }
  } catch (e) {
    console.error("DDG API failed:", e.message);
  }

  // Fallback: scrape DDG HTML
  try {
    const htmlUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const resp = await fetch(htmlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await resp.text();

    const results = [];
    const linkPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetPattern = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let m;
    const links = [];
    while ((m = linkPattern.exec(html)) !== null) {
      links.push({ url: m[1], title: m[2].replace(/<[^>]*>/g, "").trim() });
    }

    const snippets = [];
    while ((m = snippetPattern.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]*>/g, "").trim());
    }

    for (let i = 0; i < Math.min(links.length, 5); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || "",
      });
    }

    console.log(`DDG HTML found ${results.length} results for: ${query}`);
    return results;
  } catch (e) {
    console.error("DDG HTML failed:", e.message);
  }

  console.log(`No search results for: ${query}`);
  return [];
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY not configured" });
  }

  try {
    let messages = req.body.messages;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

    if (lastUserMsg) {
      const searchResults = await searchWeb(lastUserMsg.content);
      if (searchResults.length > 0) {
        const searchContext = `[Real-time web search results]\n${searchResults
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}${r.url ? `\n   URL: ${r.url}` : ""}`)
          .join("\n")}\n\nUse the above search results to provide accurate, up-to-date information. If the search results don't contain relevant information, use your own knowledge.`;

        messages = [
          ...messages.slice(0, -1),
          { role: "system", content: searchContext },
          lastUserMsg,
        ];
      }
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...req.body, messages }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    if (req.body.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      return res.end();
    }

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Proxy error", detail: String(err) });
  }
}
