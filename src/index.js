export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/analyze" ||
      url.pathname === "/api/analyse"
    ) {
      const title = (
        url.searchParams.get("title") || ""
      ).trim();

      if (!title) {
        return Response.json(
          { error: "Missing title" },
          { status: 400 }
        );
      }

      /*
       * PERSONAL PROFILE
       *
       * The website can send the child's age and
       * personalised family rules to the Worker.
       */

      const childAge =
        url.searchParams.get("age") || "10";

      let familyRules = {};

      const rulesText =
        url.searchParams.get("rules") || "";

      if (rulesText) {
        try {
          familyRules = JSON.parse(rulesText);
        } catch {
          familyRules = {};
        }
      }

      /*
       * Existing CleanStream calibration dataset.
       */

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

      const result =
        results[title.toLowerCase()];

      /*
       * Existing calibration results remain available.
       *
       * For now these known examples are returned
       * exactly as calibrated.
       */

      if (result) {
        return Response.json({
          title,
          decision: result[0],
          emoji: result[1],
          reason: result[2],
          source: "CleanStream calibration dataset"
        });
      }

      /*
       * AI unavailable
       */

      if (!env.AI) {
        return Response.json({
          title,
          decision: "YELLOW",
          emoji: "🟡",
          reason:
            "AI verification is not currently available. Parent review is required rather than guessing.",
          source: "AI unavailable",
          confidence: "LOW"
        });
      }

      try {
        /*
         * Convert the family's selected rules into
         * clear instructions for the AI.
         */

        const ruleInstructions =
          Object.entries(familyRules)
            .map(
              ([rule, setting]) =>
                "- " + rule + ": " + setting
            )
            .join("\n");

        const prompt =
          "You are CleanStream AI, a strict children's content screening assistant.\n\n" +

          "Evaluate the programme or episode title below for a child aged " +
          childAge +
          " in the UK.\n\n" +

          "Title: \"" +
          title +
          "\"\n\n" +

          "THIS FAMILY'S PERSONAL SCREENING RULES:\n" +

          (ruleInstructions ||
            "- No personalised rules were supplied.") +

          "\n\n" +

          "RULE SETTINGS:\n" +
          "ALLOW means the family allows that category.\n" +
          "REVIEW means the category requires parent review.\n" +
          "BLOCK means the category conflicts with the family's rules and should result in RED when the category is meaningfully present.\n\n" +

          "IMPORTANT:\n" +
          "You must NOT claim that you researched, verified, browsed, or checked this programme.\n" +
          "Use only information you are genuinely confident you know.\n" +
          "Do not invent episodes, characters, relationships, themes, jokes, language, or other content.\n" +
          "If important information is uncertain, use YELLOW.\n\n" +

          "HOLIDAY AND BIRTHDAY RULE:\n" +
          "If the title is an individual episode substantially centred on a birthday or holiday celebration such as Christmas, Halloween, Easter, Thanksgiving or New Year, and the family's Holiday celebrations or Birthday celebrations rule is BLOCK, use RED.\n" +
          "A brief mention is not enough.\n" +
          "If the title is a series rather than an individual episode, do not use RED simply because the series may contain holiday or birthday episodes.\n" +
          "Individual episodes should be screened separately.\n\n" +

          "WITCHCRAFT AND MAGIC RULE:\n" +
          "If the family's Witchcraft / magic / supernatural rule is BLOCK and the programme or episode meaningfully contains witchcraft, wizardry, spells, sorcery, magic or similar supernatural practices, use RED.\n" +
          "If you cannot determine this reliably, use YELLOW.\n\n" +

          "DECISION RULE:\n" +
          "GREEN = the programme is suitable under the family's selected rules and you have strong confidence.\n" +
          "YELLOW = information is incomplete, uncertain, conflicting, or a REVIEW category is meaningfully present.\n" +
          "RED = a BLOCK category is meaningfully present and you have strong confidence.\n\n" +

          "Never turn uncertainty into GREEN.\n\n" +

          "Return ONLY valid JSON in exactly this format:\n" +
          "{\n" +
          "  \"decision\": \"GREEN\" or \"YELLOW\" or \"RED\",\n" +
          "  \"reason\": \"short factual explanation\",\n" +
          "  \"confidence\": \"HIGH\" or \"MEDIUM\" or \"LOW\"\n" +
          "}";

        const aiResponse =
          await env.AI.run(
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
          aiResponse?.choices?.[0]?.message?.content ||
          "";

        const cleaned =
          text
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
            reason:
              "The AI did not provide a reliable structured result. Parent review is required rather than guessing.",
            source: "Cloudflare Workers AI",
            confidence: "LOW"
          });
        }

        const allowed = [
          "GREEN",
          "YELLOW",
          "RED"
        ];

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
          reason:
            parsed.reason ||
            "Parent review is required.",
          source: "Cloudflare Workers AI",
          confidence:
            parsed.confidence || "LOW"
        });

      } catch (error) {

        return Response.json({
          title,
          decision: "YELLOW",
          emoji: "🟡",
          reason:
            "AI verification could not be completed. Parent review is required.",
          source: "AI error",
          confidence: "LOW"
        });

      }
    }

    return env.ASSETS.fetch(request);
  }
};
