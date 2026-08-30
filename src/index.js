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
       * NORMALISE THE FAMILY RULE SETTINGS
       */

      const normaliseRule = (value) => {
        if (!value) return "";
        return String(value).toUpperCase().trim();
      };

      const holidayRule = normaliseRule(
        familyRules["Holiday celebrations"]
      );

      const birthdayRule = normaliseRule(
        familyRules["Birthday celebrations"]
      );

      const magicRule = normaliseRule(
        familyRules["Witchcraft / magic / supernatural"]
      );

      /*
       * HARD FAMILY RULE CHECKS
       *
       * These rules are enforced by CleanStream
       * when the title itself gives a clear indication.
       */

      const lowerTitle = title.toLowerCase();

      const holidayWords = [
        "christmas",
        "halloween",
        "easter",
        "thanksgiving",
        "new year",
        "new year's",
        "new years",
        "valentine",
        "valentine's"
      ];

      const birthdayWords = [
        "birthday",
        "birthdays"
      ];

      const magicWords = [
        "witch",
        "witches",
        "witchcraft",
        "wizard",
        "wizards",
        "wizardry",
        "spell",
        "spells",
        "sorcery",
        "magic",
        "magical"
      ];

      const containsHolidayWord =
        holidayWords.some(
          word => lowerTitle.includes(word)
        );

      const containsBirthdayWord =
        birthdayWords.some(
          word => lowerTitle.includes(word)
        );

      const containsMagicWord =
        magicWords.some(
          word => lowerTitle.includes(word)
        );

      /*
       * HARD RED:
       * Holiday / birthday / magic when the
       * corresponding family rule is BLOCK.
       *
       * This is intentionally based on the title,
       * because we cannot claim to know unseen
       * episode content from the title alone.
       */

      if (
        holidayRule === "BLOCK" &&
        containsHolidayWord
      ) {
        return Response.json({
          title,
          decision: "RED",
          emoji: "🔴",
          reason:
            "The title indicates an individual holiday-themed episode, and this family's rules block holiday celebrations.",
          source:
            "CleanStream family rule engine",
          confidence: "HIGH"
        });
      }

      if (
        birthdayRule === "BLOCK" &&
        containsBirthdayWord
      ) {
        return Response.json({
          title,
          decision: "RED",
          emoji: "🔴",
          reason:
            "The title indicates a birthday-themed episode, and this family's rules block birthday celebrations.",
          source:
            "CleanStream family rule engine",
          confidence: "HIGH"
        });
      }

      if (
        magicRule === "BLOCK" &&
        containsMagicWord
      ) {
        return Response.json({
          title,
          decision: "RED",
          emoji: "🔴",
          reason:
            "The title indicates witchcraft, magic or similar supernatural practices, and this family's rules block this category.",
          source:
            "CleanStream family rule engine",
          confidence: "HIGH"
        });
      }

      /*
       * EXISTING CALIBRATION DATASET
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
        results[lowerTitle];

      if (result) {
        return Response.json({
          title,
          decision: result[0],
          emoji: result[1],
          reason: result[2],
          source:
            "CleanStream calibration dataset"
        });
      }

      /*
       * AI UNAVAILABLE
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
         * CONVERT FAMILY RULES INTO AI INSTRUCTIONS
         */

        const ruleInstructions =
          Object.entries(familyRules)
            .map(
              ([rule, setting]) =>
                "- " +
                rule +
                ": " +
                normaliseRule(setting)
            )
            .join("\n");

        const prompt =
          "You are CleanStream AI, a strict children's content screening assistant.\n\n" +

          "Evaluate the programme or episode title below for a child aged " +
          childAge +
          " in the UK.\n\n" +

          'Title: "' +
          title +
          '"\n\n' +

          "THIS FAMILY'S PERSONAL SCREENING RULES:\n" +

          (
            ruleInstructions ||
            "- No personalised rules were supplied."
          ) +

          "\n\n" +

          "RULE SETTINGS:\n" +
          "ALLOW means the family allows that category.\n" +
          "REVIEW means the category requires parent review.\n" +
          "BLOCK means the category conflicts with the family's rules and should result in RED when meaningfully present.\n\n" +

          "IMPORTANT:\n" +
          "You must NOT claim that you researched, verified, browsed, or checked this programme.\n" +
          "Use only information you are genuinely confident you know.\n" +
          "Do not invent episodes, characters, relationships, themes, jokes, language, or other content.\n" +
          "If important information is uncertain, use YELLOW.\n" +
          "Never turn uncertainty into GREEN.\n\n" +

          "HOLIDAY AND BIRTHDAY RULE:\n" +
          "If an individual episode is substantially centred on a birthday or holiday celebration such as Christmas, Halloween, Easter, Thanksgiving or New Year, and the corresponding family rule is BLOCK, use RED.\n" +
          "A brief mention of a holiday is not enough.\n" +
          "If the title is a series rather than an individual episode, do not mark the entire series RED merely because it may contain holiday or birthday episodes.\n" +
          "Individual episodes should be screened separately.\n\n" +

          "WITCHCRAFT AND MAGIC RULE:\n" +
          "If the family's Witchcraft / magic / supernatural rule is BLOCK and the programme or episode meaningfully contains witchcraft, wizardry, spells, sorcery, magic or similar supernatural practices, use RED.\n" +
          "If this cannot be determined reliably, use YELLOW.\n\n" +

          "DECISION RULE:\n" +
          "GREEN = suitable under the family's selected rules and strong confidence.\n" +
          "YELLOW = information is incomplete, uncertain, conflicting, or a REVIEW category is meaningfully present.\n" +
          "RED = a BLOCK category is meaningfully present and there is strong confidence.\n\n" +

          "Return ONLY valid JSON in exactly this format:\n" +

          "{\n" +
          '  "decision": "GREEN" or "YELLOW" or "RED",\n' +
          '  "reason": "short factual explanation",\n' +
          '  "confidence": "HIGH" or "MEDIUM" or "LOW"\n' +
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
            source:
              "Cloudflare Workers AI",
            confidence: "LOW"
          });
        }

        const allowed = [
          "GREEN",
          "YELLOW",
          "RED"
        ];

        if (
          !allowed.includes(
            parsed.decision
          )
        ) {
          parsed.decision = "YELLOW";
        }

        if (
          parsed.confidence === "LOW"
        ) {
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
          decision:
            parsed.decision,
          emoji,
          reason:
            parsed.reason ||
            "Parent review is required.",
          source:
            "Cloudflare Workers AI",
          confidence:
            parsed.confidence ||
            "LOW"
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
