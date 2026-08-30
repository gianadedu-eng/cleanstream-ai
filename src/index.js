export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze" || url.pathname === "/api/analyse") {
      const title = (url.searchParams.get("title") || "").trim();

      if (!title) {
        return Response.json({ error: "Missing title" }, { status: 400 });
      }

      const results = {
        "green eggs and ham": ["GREEN", "🟢", "Comedy, friendship and positive lessons"],
        "the inbestigators": ["GREEN", "🟢", "Mystery, friendship, teamwork and comedy"],
        "harvey girls forever!": ["GREEN", "🟢", "Friendship, comedy and adventure"],
        "henry danger": ["YELLOW", "🟡", "Crush/romantic material, mild inappropriate humour and cartoon violence"],
        "prince of peoria": ["RED", "🔴", "Crushes/dating, sexual innuendo and a mature joke"],
        "find me in paris": ["RED", "🔴", "Teen romance, LGBTQ theme and time-travel/fantasy"],
        "dive club": ["RED", "🔴", "Romance/flirting and same-sex romantic content"],
        "icarly": ["RED", "🔴", "Sexual jokes/references and mature humour"],
        "how to train your dragon": ["YELLOW", "🟡", "Fantasy/dragons and mild romance"],
        "paddington": ["YELLOW", "🟡", "Very mild romance/kissing, alcohol reference and mild language"]
      };

      const result = results[title.toLowerCase()];

      if (result) {
        return Response.json({
          title,
          decision: result[0],
          emoji: result[1],
          reason: result[2],
          source: "CleanStream calibration dataset"
        });
      }

      if (!env.AI) {
        return Response.json({
          title,
          decision: "YELLOW",
          emoji: "🟡",
          reason: "AI verification is not currently available. Parent review is required rather than guessing.",
          source: "AI unavailable"
        });
      }

      try {
        const aiResponse = await env.AI.run(
          "@cf/google/gemma-4-26b-a4b-it",
          {
            messages: [
              {
                role: "user",
                content:
                  "Classify this programme title for a strict children's profile aged 10 in the UK: " +
title +
". Return only JSON with decision GREEN, YELLOW or RED, a short reason, and confidence HIGH, MEDIUM or LOW. Do not claim to have researched or verified the programme. If uncertain, use YELLOW. " +
"IMPORTANT HOLIDAY AND BIRTHDAY RULE:IMPORTANT HOLIDAY RULE: If the title is an individual episode and the episode is substantially centred on a birthday or holiday celebration such as Christmas, Halloween, Easter, Thanksgiving or New Year, use RED. A brief mention of a holiday is not enough. If the title is a series rather than an individual episode, do not use RED simply because the series may contain holiday or birthday episodes. Individual episodes should be screened separately.

IMPORTANT WITCHCRAFT AND MAGIC RULE: If the programme or episode contains witchcraft, wizardry, spells, magic, sorcery or similar supernatural practices, use RED when this is a meaningful part of the content. If you cannot determine this reliably, use YELLOW.. A brief mention of a holiday is not enough. If the title is a series rather than an individual episode, do not use EXCLUDE simply because the series may contain holiday or birthday episodes. If you cannot determine this reliably, use YELLOW."
              }
            ]
          }
        );

        const text = aiResponse?.choices?.[0]?.message?.content || "";

const cleaned = text
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

let parsed;

try {
  parsed = JSON.parse(cleaned);
} catch {
  return Response.json({
    title,
    decision: "YELLOW",
    emoji: "🟡",
    reason: "The AI did not provide a reliable structured result. Parent review is required rather than guessing.",
    source: "Cloudflare Workers AI",
    confidence: "LOW"
  });
}

const allowed = ["GREEN", "YELLOW", "RED"];

if (!allowed.includes(parsed.decision)) {
  parsed.decision = "YELLOW";
}

if (parsed.confidence === "LOW") {
  parsed.decision = "YELLOW";
}

const emoji =
  parsed.decision === "GREEN"
    ? "🟢"
    : parsed.decision === "RED"
      ? "🔴"
      : "🟡";

return Response.json({
  title,
  decision: parsed.decision,
  emoji,
  reason: parsed.reason || "Parent review is required.",
  source: "Cloudflare Workers AI",
  confidence: parsed.confidence || "LOW"
});
      } catch (error) {
        return Response.json({
          title,
          decision: "YELLOW",
          emoji: "🟡",
          reason: "AI verification could not be completed. Parent review is required.",
          source: "AI error"
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
