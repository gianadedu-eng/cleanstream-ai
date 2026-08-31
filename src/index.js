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
       * HARD FAMILY RULES
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
       * TITLE-BASED CHECKS
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
       * HARD RED RULES
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
         * FAMILY RULES
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
         * AI ANALYSIS
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

          "Analyse the title as carefully as possible.\n\n" +

          "CONTENT TYPE:\n" +
          "Choose one of: EDUCATIONAL, DOCUMENTARY, FICTION, REALITY, COMEDY, ANIMATION, OTHER, UNKNOWN.\n\n" +

          "CONTENT CONTEXT:\n" +
          "Choose all that genuinely apply from: HISTORICAL_EDUCATIONAL, FICTIONAL, FANTASY, REAL_WORLD, HUMOROUS_PARODY, UNKNOWN.\n\n" +

          "SEVERITY:\n" +
          "For each detected concern, estimate NONE, MILD, MODERATE, STRONG or UNKNOWN.\n\n" +

          "CONTENT CATEGORIES:\n" +
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
          "Do not claim to have researched, browsed, verified or independently checked the programme.\n" +
          "A series should not automatically be rejected because it may contain individual episodes with a particular theme.\n" +
          "Individual episodes should be screened separately when possible.\n" +
          "If important information is uncertain, mark it UNCERTAIN.\n" +
          "Never turn uncertainty into GREEN.\n\n" +

          "PARENT RULE LOGIC:\n" +
          "ALLOW means the family allows that category.\n" +
          "REVIEW means the family wants parent review when that category is meaningfully present.\n" +
          "BLOCK means the category conflicts with the family's rules and should result in RED when meaningfully present.\n\n" +

          "Return ONLY valid JSON in exactly this structure:\n\n" +

          "{\n" +
          '  "decision": "GREEN" or "YELLOW" or "RED",\n' +
          '  "reason": "short factual explanation",\n' +
          '  "confidence": "HIGH" or "MEDIUM" or "LOW",\n' +
          '  "content_type": "EDUCATIONAL" or "DOCUMENTARY" or "FICTION" or "REALITY" or "COMEDY" or "ANIMATION" or "OTHER" or "UNKNOWN",\n' +
          '  "context": ["HISTORICAL_EDUCATIONAL", "FICTIONAL", "FANTASY", "REAL_WORLD", "HUMOROUS_PARODY", "UNKNOWN"],\n' +
          '  "categories": {\n' +
          '    "Romance / crushes": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Dating": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Sexual content": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Sexual jokes / innuendo": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "LGBTQ romantic / sexual content": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Witchcraft / magic / supernatural": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Holiday celebrations": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Birthday celebrations": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Violence": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Horror": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Bad language": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Alcohol / drugs": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Gambling": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "Blasphemy": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"}\n' +
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
         * NORMALISE AI CATEGORIES
         */

        const categories =
          parsed.categories || {};

        const blockedCategories = [];
        const reviewCategories = [];
        const uncertainCategories = [];

        /*
         * APPLY PARENT RULES
         */

        for (
          const [rule, setting]
          of Object.entries(familyRules)
        ) {
          const selected =
            normaliseRule(setting);

          const category =
            categories[rule];

          const presence =
            typeof category === "object"
              ? normaliseRule(
                  category.presence
                )
              : normaliseRule(category);

          if (
            selected === "BLOCK" &&
            presence === "YES"
          ) {
            blockedCategories.push(rule);
          }

          if (
            selected === "REVIEW" &&
            presence === "YES"
          ) {
            reviewCategories.push(rule);
          }

          if (
            (
              selected === "BLOCK" ||
              selected === "REVIEW"
            ) &&
            presence === "UNCERTAIN"
          ) {
            uncertainCategories.push(rule);
          }
        }

        /*
         * BLOCK WINS
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
            content_type:
              parsed.content_type ||
              "UNKNOWN",
            context:
              parsed.context || [],
            categories
          });
        }

        /*
         * REVIEW NEXT
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
            content_type:
              parsed.content_type ||
              "UNKNOWN",
            context:
              parsed.context || [],
            categories
          });
        }

        /*
         * UNCERTAINTY
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
            content_type:
              parsed.content_type ||
              "UNKNOWN",
            context:
              parsed.context || [],
            categories
          });
        }

        /*
         * LOW CONFIDENCE
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
            content_type:
              parsed.content_type ||
              "UNKNOWN",
            context:
              parsed.context || [],
            categories
          });
        }

        /*
         * FINAL AI RESULT
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
            "CleanStream family rule engine + Cloudflare Workers AI",
          confidence:
            parsed.confidence ||
            "MEDIUM",
          content_type:
            parsed.content_type ||
            "UNKNOWN",
          context:
            parsed.context || [],
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
