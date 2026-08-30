export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze" || url.pathname === "/api/analyse") {
      const title = (url.searchParams.get("title") || "").trim();

      if (!title) {
        return Response.json({ error: "Missing title" }, { status: 400 });
      }

      const results = {
        "green eggs and ham": [
          "GREEN",
          "🟢",
          "Comedy, friendship and positive lessons"
        ],
        "the inbestigators": [
          "GREEN",
          "🟢",
          "Mystery, friendship, teamwork and comedy"
        ],
        "harvey girls forever!": [
          "GREEN",
          "🟢",
          "Friendship, comedy and adventure"
        ],
        "henry danger": [
          "YELLOW",
          "🟡",
          "Crush/romantic material, mild inappropriate humour and cartoon violence"
        ],
        "prince of peoria": [
          "RED",
          "🔴",
          "Crushes/dating, sexual innuendo and a mature joke"
        ],
        "find me in paris": [
          "RED",
          "🔴",
          "Teen romance, LGBTQ theme and time-travel/fantasy"
        ],
        "dive club": [
          "RED",
          "🔴",
          "Romance/flirting and same-sex romantic content"
        ],
        "icarly": [
          "RED",
          "🔴",
          "Sexual jokes/references and mature humour"
        ],
        "how to train your dragon": [
          "YELLOW",
          "🟡",
          "Fantasy/dragons and mild romance"
        ],
        "paddington": [
          "YELLOW",
          "🟡",
          "Very mild romance/kissing, alcohol reference and mild language"
        ]
      };

      const key = title.toLowerCase();
      const result = results[key];

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
        const prompt = `
You are CleanStream AI, a strict children's content screening assistant.

Evaluate the programme title below for a child aged 10 in the UK.

Title: "${title}"

IMPORTANT:
You must NOT claim that you researched, verified, browsed, or checked this programme.
Use only information you are genuinely confident you know.
Do not invent episodes, characters, relationships, themes, jokes, language, or other content.

Return ONLY valid JSON in this exact format:
{
  "decision": "GREEN" or "YELLOW" or "RED",
  "reason": "short factual explanation",
  "confidence": "HIGH" or "MEDIUM" or "LOW"
}

Strict rules:

GREEN:
Use only when you have strong confidence that the programme is suitable for this strict profile.

YELLOW:
Use when information is incomplete, uncertain, conflicting, or when the programme contains potentially concerning material that requires parent review.

RED:
Use only when you have strong confidence that the programme contains significant content that clearly conflicts with this strict profile.

If you are unsure about any important part of the programme, choose YELLOW.

Never turn uncertainty into GREEN.

Never claim that information has been independently verified.
`;

        const aiResponse = await env.AI.run(
          "@cf/google/gemma-4-26b-a4b-it",
          {
            messages: [
              {
                role: "user",
                content: prompt
              }
            ]
          }
        );

        const text =
          aiResponse?.choices?.[0]?.message?.content || "";

        const cleaned = String(text)
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
            reason: "The AI could not provide a reliable structured result. Parent review is required rather than guessing.",
            source: "AI uncertain"
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
          confidence: parsed.confidence || "LOW",
          source: "Cloudflare Workers AI"
        });
      } catch (error) {
        return Response.json({
          title,
          decision: "YELLOW",
          emoji: "🟡",
          reason: "AI verification could not be completed. Parent review is required rather than guessing.",
          source: "AI error"
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
