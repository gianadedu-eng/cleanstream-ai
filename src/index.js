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

      const normalise = (value) => {
        if (!value) return "";
        return String(value).toUpperCase().trim();
      };

      /*
       * CLEANSTREAM INTERNAL CATEGORY SYSTEM
       *
       * These IDs must remain stable even if
       * the wording shown to parents changes.
       */

      const categories = {
        romance: {
          label: "Romance / crushes"
        },
        dating: {
          label: "Dating"
        },
        sexual_content: {
          label: "Sexual content"
        },
        sexual_jokes: {
          label: "Sexual jokes / innuendo"
        },
        lgbtq_romantic: {
          label: "LGBTQ romantic / sexual content"
        },
        magic: {
          label:
            "Witchcraft / magic / supernatural"
        },
        holiday: {
          label: "Holiday celebrations"
        },
        birthday: {
          label: "Birthday celebrations"
        },
        violence: {
          label: "Violence"
        },
        horror: {
          label: "Horror"
        },
        bad_language: {
          label: "Bad language"
        },
        alcohol_drugs: {
          label: "Alcohol / drugs"
        },
        gambling: {
          label: "Gambling"
        },
        blasphemy: {
          label: "Blasphemy"
        }
      };

      /*
       * MATCH PARENT RULE NAMES TO INTERNAL IDs
       */

      const ruleAliases = {
        romance: [
          "Romance / crushes",
          "Romance",
          "Crushes"
        ],
        dating: [
          "Dating"
        ],
        sexual_content: [
          "Sexual content",
          "Sexual Content"
        ],
        sexual_jokes: [
          "Sexual jokes / innuendo",
          "Sexual jokes",
          "Sexual innuendo"
        ],
        lgbtq_romantic: [
          "LGBTQ romantic / sexual content",
          "LGBTQ content",
          "LGBTQ"
        ],
        magic: [
          "Witchcraft / magic / supernatural",
          "Witchcraft",
          "Magic",
          "Supernatural"
        ],
        holiday: [
          "Holiday celebrations",
          "Holiday",
          "Holidays"
        ],
        birthday: [
          "Birthday celebrations",
          "Birthday",
          "Birthdays"
        ],
        violence: [
          "Violence"
        ],
        horror: [
          "Horror"
        ],
        bad_language: [
          "Bad language",
          "Language"
        ],
        alcohol_drugs: [
          "Alcohol / drugs",
          "Alcohol",
          "Drugs"
        ],
        gambling: [
          "Gambling"
        ],
        blasphemy: [
          "Blasphemy"
        ]
      };

      /*
       * GET THE SETTING FOR EACH INTERNAL CATEGORY
       */

      const getRuleSetting = (categoryId) => {
        const aliases =
          ruleAliases[categoryId] || [];

        for (
          const alias of aliases
        ) {
          if (
            Object.prototype.hasOwnProperty.call(
              familyRules,
              alias
            )
          ) {
            return normalise(
              familyRules[alias]
            );
          }
        }

        /*
         * Also support profiles that already use
         * the new internal IDs.
         */

        if (
          Object.prototype.hasOwnProperty.call(
            familyRules,
            categoryId
          )
        ) {
          return normalise(
            familyRules[categoryId]
          );
        }

        return "";
      };

      /*
       * TITLE-BASED HARD CHECKS
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

      const containsHoliday =
        holidayWords.some(
          word =>
            lowerTitle.includes(word)
        );

      const containsBirthday =
        birthdayWords.some(
          word =>
            lowerTitle.includes(word)
        );

      const containsMagic =
        magicWords.some(
          word =>
            lowerTitle.includes(word)
        );

      /*
       * HARD RED:
       * These are based only on what the title
       * clearly indicates.
       */

      if (
        getRuleSetting("holiday") ===
          "BLOCK" &&
        containsHoliday
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
        getRuleSetting("birthday") ===
          "BLOCK" &&
        containsBirthday
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
        getRuleSetting("magic") ===
          "BLOCK" &&
        containsMagic
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
         * BUILD RULE SUMMARY
         */

        const activeRules =
          Object.keys(categories)
            .map(categoryId => {
              const setting =
                getRuleSetting(
                  categoryId
                );

              return (
                categoryId +
                ": " +
                (setting || "NOT SET")
              );
            })
            .join("\n");

        /*
         * AI PROMPT
         */

        const prompt =
          "You are CleanStream AI, a strict children's content screening assistant.\n\n" +

          "Evaluate the programme or episode title below for a child aged " +
          childAge +
          " in the UK.\n\n" +

          'Title: "' +
          title +
          '"\n\n' +

          "FAMILY RULE SETTINGS:\n" +
          activeRules +
          "\n\n" +

          "Analyse the title using ONLY the following permanent category IDs:\n\n" +

          "romance = romance or crushes\n" +
          "dating = dating or romantic relationships\n" +
          "sexual_content = sexual content\n" +
          "sexual_jokes = sexual jokes, innuendo or suggestive humour\n" +
          "lgbtq_romantic = LGBTQ romantic or sexual content\n" +
          "magic = witchcraft, wizardry, spells, sorcery or supernatural practices\n" +
          "holiday = holiday celebrations\n" +
          "birthday = birthday celebrations\n" +
          "violence = violence\n" +
          "horror = horror or frightening material\n" +
          "bad_language = swearing or offensive language\n" +
          "alcohol_drugs = alcohol or drugs\n" +
          "gambling = gambling\n" +
          "blasphemy = blasphemy or irreverent religious content\n\n" +

          "CONTENT TYPE:\n" +
          "Choose EDUCATIONAL, DOCUMENTARY, FICTION, REALITY, COMEDY, ANIMATION, OTHER or UNKNOWN.\n\n" +

          "CONTEXT:\n" +
          "Choose any that genuinely apply: HISTORICAL_EDUCATIONAL, FICTIONAL, FANTASY, REAL_WORLD, HUMOROUS_PARODY or UNKNOWN.\n\n" +

          "SEVERITY:\n" +
          "For each category use NONE, MILD, MODERATE, STRONG or UNKNOWN.\n\n" +

          "IMPORTANT:\n" +
          "Do not invent episodes, characters, relationships, themes, jokes, language or other content.\n" +
          "Do not claim to have researched, browsed, verified or independently checked the programme.\n" +
          "If information is uncertain, mark the category UNCERTAIN.\n" +
          "Never turn uncertainty into GREEN.\n" +
          "Educational or historical context must be identified when appropriate.\n\n" +

          "Return ONLY valid JSON in this structure:\n\n" +

          "{\n" +
          '  "decision": "GREEN" or "YELLOW" or "RED",\n' +
          '  "reason": "short factual explanation",\n' +
          '  "confidence": "HIGH" or "MEDIUM" or "LOW",\n' +
          '  "content_type": "EDUCATIONAL" or "DOCUMENTARY" or "FICTION" or "REALITY" or "COMEDY" or "ANIMATION" or "OTHER" or "UNKNOWN",\n' +
          '  "context": ["HISTORICAL_EDUCATIONAL", "FICTIONAL", "FANTASY", "REAL_WORLD", "HUMOROUS_PARODY", "UNKNOWN"],\n' +
          '  "categories": {\n' +
          '    "romance": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "dating": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "sexual_content": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "sexual_jokes": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "lgbtq_romantic": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "magic": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "holiday": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "birthday": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "violence": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "horror": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "bad_language": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "alcohol_drugs": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "gambling": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"},\n' +
          '    "blasphemy": {"presence": "YES" or "NO" or "UNCERTAIN", "severity": "NONE" or "MILD" or "MODERATE" or "STRONG" or "UNKNOWN"}\n' +
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
          parsed =
            JSON.parse(cleaned);
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

        const aiCategories =
          parsed.categories || {};

        const blocked = [];
        const review = [];
        const uncertain = [];

        /*
         * APPLY PARENT RULES USING INTERNAL IDs
         */

        for (
          const categoryId
          of Object.keys(categories)
        ) {
          const setting =
            getRuleSetting(
              categoryId
            );

          const result =
            aiCategories[
              categoryId
            ];

          const presence =
            result &&
            typeof result ===
              "object"
              ? normalise(
                  result.presence
                )
              : normalise(result);

          if (
            setting === "BLOCK" &&
            presence === "YES"
          ) {
            blocked.push(
              categories[
                categoryId
              ].label
            );
          }

          if (
            setting === "REVIEW" &&
            presence === "YES"
          ) {
            review.push(
              categories[
                categoryId
              ].label
            );
          }

          if (
            (
              setting === "BLOCK" ||
              setting === "REVIEW"
            ) &&
            presence ===
              "UNCERTAIN"
          ) {
            uncertain.push(
              categories[
                categoryId
              ].label
            );
          }
        }

        /*
         * BLOCK WINS
         */

        if (blocked.length) {
          return Response.json({
            title,
            decision: "RED",
            emoji: "🔴",
            reason:
              "The content was identified as: " +
              blocked.join(", ") +
              ". This family's rules block this category.",
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
            categories:
              aiCategories
          });
        }

        /*
         * REVIEW
         */

        if (review.length) {
          return Response.json({
            title,
            decision: "YELLOW",
            emoji: "🟡",
            reason:
              "The content was identified as: " +
              review.join(", ") +
              ". This family's rules require parent review.",
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
            categories:
              aiCategories
          });
        }

        /*
         * UNCERTAINTY
         */

        if (uncertain.length) {
          return Response.json({
            title,
            decision: "YELLOW",
            emoji: "🟡",
            reason:
              "CleanStream could not reliably determine whether the following family-controlled categories are present: " +
              uncertain.join(", ") +
              ". Parent review is required rather than guessing.",
            source:
              "CleanStream family rule engine + Cloudflare Workers AI",
            confidence: "LOW",
            content_type:
              parsed.content_type ||
              "UNKNOWN",
            context:
              parsed.context || [],
            categories:
              aiCategories
          });
        }

        /*
         * LOW CONFIDENCE
         */

        if (
          normalise(
            parsed.confidence
          ) === "LOW"
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
            categories:
              aiCategories
          });
        }

        /*
         * FINAL RESULT
         */

        const allowed =
          [
            "GREEN",
            "YELLOW",
            "RED"
          ];

        if (
          !allowed.includes(
            parsed.decision
          )
        ) {
          parsed.decision =
            "YELLOW";
        }

        const emoji =
          parsed.decision ===
          "GREEN"
            ? "🟢"
            : parsed.decision ===
              "RED"
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
          categories:
            aiCategories
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
