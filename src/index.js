const FAMILY_RULES = {
  romance: "BLOCK",
  dating: "BLOCK",
  sexual_content: "BLOCK",
  sexual_jokes: "BLOCK",
  lgbtq_romantic: "BLOCK",
  magic: "BLOCK",
  holiday: "BLOCK",
  birthday: "BLOCK",
  violence: "REVIEW",
  horror: "BLOCK",
  bad_language: "REVIEW",
  alcohol_drugs: "BLOCK",
  gambling: "BLOCK",
  blasphemy: "BLOCK"
};

const KNOWN_TITLES = {
  "green eggs and ham": {
    decision: "GREEN",
    reason: "Comedy, friendship and positive lessons."
  },

  "the inbestigators": {
    decision: "GREEN",
    reason: "Mystery, friendship, teamwork and comedy."
  },

  "harvey girls forever!": {
    decision: "GREEN",
    reason: "Friendship, comedy and adventure."
  },

  "horrible histories": {
    decision: "GREEN",
    reason: "Educational historical content approved for the family."
  },

  "sam and cat": {
    decision: "RED",
    reason: "This programme is on the family's known RED list."
  },

  "prince of peoria": {
    decision: "RED",
    reason: "Crushes/dating, sexual innuendo and mature humour."
  },

  "find me in paris": {
    decision: "RED",
    reason: "Teen romance, LGBTQ themes and fantasy/time-travel elements."
  },

  "dive club": {
    decision: "RED",
    reason: "Romance/flirting and same-sex romantic content."
  },

  "icarly": {
    decision: "RED",
    reason: "Sexual jokes/references and mature humour."
  }
};

const HOLIDAY_WORDS = [
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

const BIRTHDAY_WORDS = [
  "birthday",
  "birthdays"
];

const MAGIC_WORDS = [
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

function normaliseTitle(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function containsAny(text, words) {
  return words.some(function (word) {
    return text.includes(word);
  });
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

function checkKnownTitle(title) {
  return KNOWN_TITLES[normaliseTitle(title)] || null;
}

function checkHardRules(title) {
  const normalised = normaliseTitle(title);

  if (
    FAMILY_RULES.holiday === "BLOCK" &&
    containsAny(normalised, HOLIDAY_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates a holiday-themed programme or episode, and this family's rules block holiday celebrations.",
      confidence: "HIGH",
      source: "CleanStream family rule engine"
    };
  }

  if (
    FAMILY_RULES.birthday === "BLOCK" &&
    containsAny(normalised, BIRTHDAY_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates a birthday-themed programme or episode, and this family's rules block birthday celebrations.",
      confidence: "HIGH",
      source: "CleanStream family rule engine"
    };
  }

  if (
    FAMILY_RULES.magic === "BLOCK" &&
    containsAny(normalised, MAGIC_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates magic, witchcraft, wizardry, spells or similar supernatural practices, which this family's rules block.",
      confidence: "HIGH",
      source: "CleanStream family rule engine"
    };
  }

  return null;
}

function buildPrompt(title) {
  return `
You are CleanStream AI.

Analyze this programme or episode according to this family's specific rules.

TITLE:
"${title}"

FAMILY RULES:

Romance / crushes: ${FAMILY_RULES.romance}
Dating: ${FAMILY_RULES.dating}
Sexual content: ${FAMILY_RULES.sexual_content}
Sexual jokes / innuendo: ${FAMILY_RULES.sexual_jokes}
LGBTQ romantic / sexual content: ${FAMILY_RULES.lgbtq_romantic}
Magic / witchcraft / supernatural practices: ${FAMILY_RULES.magic}
Holiday celebrations: ${FAMILY_RULES.holiday}
Birthday celebrations: ${FAMILY_RULES.birthday}
Violence: ${FAMILY_RULES.violence}
Horror: ${FAMILY_RULES.horror}
Bad language: ${FAMILY_RULES.bad_language}
Alcohol / drugs: ${FAMILY_RULES.alcohol_drugs}
Gambling: ${FAMILY_RULES.gambling}
Blasphemy: ${FAMILY_RULES.blasphemy}

For each category determine:

presence:
YES, NO, or UNCERTAIN

severity:
NONE, MILD, MODERATE, STRONG, or UNKNOWN

Also determine:

content_type:
EDUCATIONAL, DOCUMENTARY, FICTION, REALITY, COMEDY, ANIMATION, OTHER, UNKNOWN

context:
HISTORICAL_EDUCATIONAL, FICTIONAL, FANTASY, REAL_WORLD, HUMOROUS_PARODY, UNKNOWN

IMPORTANT:

- Follow this family's rules, not general age ratings.
- Do not invent facts.
- Do not claim you researched the title.
- Do not automatically mark educational or historical violence as RED.
- Clear conflict with a BLOCK rule should be RED.
- A mild BLOCK category should normally be YELLOW unless another clear conflict exists.
- REVIEW categories normally result in YELLOW.
- If important information is uncertain, return YELLOW.
- If there is no meaningful conflict with the family rules, return GREEN.

Return ONLY valid JSON.

Use this structure:

{
  "decision": "GREEN",
  "reason": "short explanation",
  "confidence": "HIGH",
  "content_type": "ANIMATION",
  "context": "FICTIONAL",
  "categories": {
    "romance": {"presence": "NO", "severity": "NONE"},
    "dating": {"presence": "NO", "severity": "NONE"},
    "sexual_content": {"presence": "NO", "severity": "NONE"},
    "sexual_jokes": {"presence": "NO", "severity": "NONE"},
    "lgbtq_romantic": {"presence": "NO", "severity": "NONE"},
    "magic": {"presence": "NO", "severity": "NONE"},
    "holiday": {"presence": "NO", "severity": "NONE"},
    "birthday": {"presence": "NO", "severity": "NONE"},
    "violence": {"presence": "NO", "severity": "NONE"},
    "horror": {"presence": "NO", "severity": "NONE"},
    "bad_language": {"presence": "NO", "severity": "NONE"},
    "alcohol_drugs": {"presence": "NO", "severity": "NONE"},
    "gambling": {"presence": "NO", "severity": "NONE"},
    "blasphemy": {"presence": "NO", "severity": "NONE"}
  }
}
`;
}

function extractJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text.trim());
  } catch (error) {
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function normaliseAIResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const decision = String(result.decision || "").toUpperCase();

  if (
    decision !== "GREEN" &&
    decision !== "YELLOW" &&
    decision !== "RED"
  ) {
    return null;
  }

  const confidenceValue = String(
    result.confidence || "LOW"
  ).toUpperCase();

  const confidence =
    confidenceValue === "HIGH" ||
    confidenceValue === "MEDIUM" ||
    confidenceValue === "LOW"
      ? confidenceValue
      : "LOW";

  return {
    decision: decision,
    reason:
      String(result.reason || "").trim() ||
      "CleanStream could not provide a detailed explanation.",
    confidence: confidence,
    content_type:
      String(result.content_type || "UNKNOWN").toUpperCase(),
    context:
      String(result.context || "UNKNOWN").toUpperCase(),
    categories: result.categories || {}
  };
}

function categoryName(category) {
  const names = {
    romance: "Romance / crushes",
    dating: "Dating",
    sexual_content: "Sexual content",
    sexual_jokes: "Sexual jokes / innuendo",
    lgbtq_romantic: "LGBTQ romantic / sexual content",
    magic: "Magic / witchcraft",
    holiday: "Holiday celebrations",
    birthday: "Birthday celebrations",
    violence: "Violence",
    horror: "Horror",
    bad_language: "Bad language",
    alcohol_drugs: "Alcohol / drugs",
    gambling: "Gambling",
    blasphemy: "Blasphemy"
  };

  return names[category] || category;
}

function applyFamilyRules(ai) {
  const categories = ai.categories || {};

  const blocked = [];
  const review = [];
  const uncertain = [];

  for (const category of Object.keys(FAMILY_RULES)) {
    const rule = FAMILY_RULES[category];
    const data = categories[category];

    if (!data) {
      uncertain.push(category);
      continue;
    }

    const presence = String(
      data.presence || ""
    ).toUpperCase();

    const severity = String(
      data.severity || "UNKNOWN"
    ).toUpperCase();

    if (presence === "YES") {
      if (rule === "BLOCK") {
        if (
          severity === "STRONG" ||
          severity === "MODERATE"
        ) {
          blocked.push(category);
        } else if (severity === "MILD") {
          review.push(category);
        } else {
          uncertain.push(category);
        }
      }

      if (rule === "REVIEW") {
        review.push(category);
      }
    }

    if (presence === "UNCERTAIN") {
      uncertain.push(category);
    }
  }

  if (blocked.length > 0) {
    return {
      ...ai,
      decision: "RED",
      reason:
        "CleanStream identified content that conflicts with this family's rules: " +
        blocked.map(categoryName).join(", ") +
        "."
    };
  }

  if (review.length > 0) {
    return {
      ...ai,
      decision: "YELLOW",
      reason:
        "CleanStream identified content that may need parent review: " +
        review.map(categoryName).join(", ") +
        "."
    };
  }

  if (
    uncertain.length > 0 ||
    ai.confidence === "LOW"
  ) {
    return {
      ...ai,
      decision: "YELLOW",
      confidence: "LOW",
      reason:
        "CleanStream could not reliably determine whether some family-controlled categories are present. Parent review is required rather than guessing."
    };
  }

  return {
    ...ai,
    decision: "GREEN"
  };
}

async function analyseTitle(title, env) {
  if (!title || !String(title).trim()) {
    return {
      decision: "YELLOW",
      reason: "Please enter a programme or episode title.",
      confidence: "LOW",
      source: "CleanStream"
    };
  }

  const known = checkKnownTitle(title);

  if (known) {
    return {
      decision: known.decision,
      reason: known.reason,
      confidence: "HIGH",
      source: "CleanStream family title list"
    };
  }

  const hardRule = checkHardRules(title);

  if (hardRule) {
    return hardRule;
  }

  if (!env.AI) {
    return {
      decision: "YELLOW",
      reason:
        "CleanStream AI is not available. Parent review is required.",
      confidence: "LOW",
      source: "CleanStream"
    };
  }

  try {
    const response = await env.AI.run(
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "user",
            content: buildPrompt(title)
          }
        ],
        max_tokens: 1200
      }
    );

    let text = "";

    if (typeof response === "string") {
      text = response;
    } else if (response && response.response) {
      text = response.response;
    } else if (response && response.result) {
      text = response.result;
    } else {
      text = JSON.stringify(response);
    }

    const parsed = extractJson(text);
    const aiResult = normaliseAIResult(parsed);

    if (!aiResult) {
      return {
        decision: "YELLOW",
        reason:
          "CleanStream could not reliably interpret the AI analysis. Parent review is required rather than guessing.",
        confidence: "LOW",
        source: "CleanStream AI"
      };
    }

    return {
      ...applyFamilyRules(aiResult),
      source: "CleanStream AI"
    };
  } catch (error) {
    return {
      decision: "YELLOW",
      reason:
        "CleanStream could not complete the AI analysis. Parent review is required rather than guessing.",
      confidence: "LOW",
      source: "CleanStream AI"
    };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/analyse" ||
      url.pathname === "/api/analyze"
    ) {
      const title = url.searchParams.get("title");

      const result = await analyseTitle(title, env);

      return jsonResponse({
        title: title || "",
        ...result
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "CleanStream AI is running.",
      {
        headers: {
          "content-type": "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
