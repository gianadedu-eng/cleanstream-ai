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

      const normaliseRule = (value) => {
        if (!value) return "";
        return String(value).toUpperCase().trim();
      };

      /*
       * FAMILY RULES
       */

      const holidayRule = normaliseRule(
        familyRules["Holiday celebrations"]
      );

      const birthdayRule = normaliseRule(
        familyRules["Birthday celebrations"]
      );

      const magicRule = normaliseRule(
        familyRules[
          "Witchcraft / magic / supernatural"
        ]
      );

      /*
       * TITLE-BASED HARD RULES
       *
       * These only trigger when the title itself
       * gives a clear indication.
       */

      const lowerTitle =
        title.toLowerCase();

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
       * HARD BLOCKS
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
            "The title indicates a holiday-themed episode, and this family's rules block holiday celebrations.",
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
       * AI AVAILABILITY
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
         * SEND THE PARENT'S RULES TO THE AI
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

        /*
         * ASK AI TO IDENTIFY CONTENT CATEGORIES
         */

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

          "Your task is to identify content categories that are meaningfully present.\n" +

          "Possible categories are:\n" +
          "- Romance / crushes\n" +
          "- Dating\n" +
          "- Sexual content\n" +
          "- Sexual jokes / innuendo\n" +
          "- LGBTQ romantic / sexual content\n" +
          "- Witchcraft / magic / supernatural\n" +
          "- Holiday celebrations\n" +
          "- Birthday celebrations\n" +
          "- Violence\n" +
          "- Horror\n" +
          "- Bad language\n" +
          "- Alcohol / drugs\n" +
          "- Gambling\n" +
          "- Blasphemy\n\n" +

          "IMPORTANT:\n" +
          "Do not invent episodes, characters, relationships, themes, jokes, language or other content.\n" +
          "Do not claim that you researched, browsed, verified or independently checked the programme.\n" +
          "If you cannot reliably determine whether a category is present, mark that category as uncertain rather than claiming it is present.\n" +
          "A series should not automatically be rejected merely because it may contain an individual holiday or birthday episode.\n" +
          "Individual episodes should be screened separately.\n\n" +

          "Return ONLY valid JSON in exactly this format:\n" +

          "{\n" +
          '  "decision": "GREEN" or "YELLOW" or "RED",\n' +
          '  "reason": "short factual explanation",\n' +
          '  "confidence": "HIGH" or "MEDIUM" or "LOW",\n' +
          '  "categories": {\n' +
          '    "Romance / crushes": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Dating": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Sexual content": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Sexual jokes / innuendo": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "LGBTQ romantic / sexual content": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Witchcraft / magic / supernatural": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Holiday celebrations": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Birthday celebrations": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Violence": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Horror": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Bad language": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Alcohol / drugs": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Gambling": "YES" or "NO" or "UNCERTAIN",\n' +
          '    "Blasphemy": "YES" or "NO" or "UNCERTAIN"\n' +
          "  }\n" +
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

        /*
         * VALIDATE THE AI RESULT
         */

        const allowedDecisions = [
          "GREEN",
          "YELLOW",
          "RED"
        ];

        if (
          !allowedDecisions.includes(
            parsed.decision
          )
        ) {
          parsed.decision = "YELLOW";
        }

        /*
         * PARENT RULE ENGINE
         *
         * BLOCK + YES = RED
         * REVIEW + YES = YELLOW
         * UNCERTAIN + BLOCK/REVIEW = YELLOW
         */

        const categories =
          parsed.categories || {};

        const blockedCategories = [];
        const reviewCategories = [];
        const uncertainCategories = [];

        for (
          const [rule, setting]
          of Object.entries(familyRules)
        ) {
          const normalisedSetting =
            normaliseRule(setting);

          const categoryResult =
            String(
              categories[rule] || ""
            )
              .toUpperCase()
              .trim();

          if (
            normalisedSetting === "BLOCK" &&
            categoryResult === "YES"
          ) {
            blockedCategories.push(rule);
          }

          if (
            normalisedSetting === "REVIEW" &&
            categoryResult === "YES"
          ) {
            reviewCategories.push(rule);
          }

          if (
            (
              normalisedSetting === "BLOCK" ||
              normalisedSetting === "REVIEW"
            ) &&
            categoryResult === "UNCERTAIN"
          ) {
            uncertainCategories.push(rule);
          }
        }

        /*
         * BLOCK ALWAYS WINS
         */

        if (
          blockedCategories.length > 0
        ) {
          return Response.json({
            title,
            decision: "RED",
            emoji: "🔴",
            reason:
              "The content was identified as: " +
              blockedCategories.join(", ") +
              ". This family's rules block this category.",
            source:
              "CleanStream family rule engine + Cloudflare Workers AI",
            confidence:
              parsed.confidence || "MEDIUM",
            categories
          });
        }

        /*
         * REVIEW PRODUCES YELLOW
         */

        if (
          reviewCategories.length > 0
        ) {
          return Response.json({
            title,
            decision: "YELLOW",
            emoji: "🟡",
            reason:
              "The content was identified as: " +
              reviewCategories.join(", ") +
              ". This family's rules require parent review.",
            source:
              "CleanStream family rule engine + Cloudflare Workers AI",
            confidence:
              parsed.confidence || "MEDIUM",
            categories
          });
        }

        /*
         * IMPORTANT UNCERTAINTY
         *
         * Never turn uncertainty into GREEN.
         */

        if (
          uncertainCategories.length > 0
        ) {
          return Response.json({
            title,
            decision: "YELLOW",
            emoji: "🟡",
            reason:
              "CleanStream could not reliably determine whether the following family-controlled categories are present: " +
              uncertainCategories.join(", ") +
              ". Parent review is required rather than guessing.",
            source:
              "CleanStream family rule engine + Cloudflare Workers AI",
            confidence: "LOW",
            categories
          });
        }

        /*
         * LOW AI CONFIDENCE CANNOT PRODUCE GREEN
         */

        if (
          parsed.confidence === "LOW"
        ) {
          return Response.json({
            title,
            decision: "YELLOW",
            emoji: "🟡",
            reason:
              parsed.reason ||
              "The AI is not sufficiently confident to give a GREEN decision.",
            source:
              "Cloudflare Workers AI",
            confidence: "LOW",
            categories
          });
        }

        /*
         * OTHERWISE USE THE AI RESULT
         */

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
            "Cloudflare Workers AI + CleanStream family rule engine",
          confidence:
            parsed.confidence ||
            "MEDIUM",
          categories
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
