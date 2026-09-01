// CleanStream AI — Your Family Edition
// Simple family rule engine + AI fallback

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

// ============================================================
// YOUR FAMILY'S KNOWN TITLES
//
// Add programmes or individual episodes here when you already
// know the answer. These decisions override the AI.
//
// GREEN = okay for your family
// RED   = not okay for your family
// YELLOW = you want to review it yourself
//
// Use lowercase titles.
// ============================================================

const KNOWN_TITLES = {
  // Examples:

  "sam and cat": {
    decision: "RED",
    reason: "This programme is on the family's known RED list."
  },

  // "green eggs and ham": {
  //   decision: "GREEN",
  //   reason: "This programme is approved for the family."
  // },

  // "horrible histories": {
  //   decision: "GREEN",
  //   reason: "Educational history programme approved for the family."
  // },

  // Add your own titles below:
  //
  // "title here": {
  //   decision: "RED",
  //   reason: "Reason..."
  // },

  // "another title": {
  //   decision: "GREEN",
  //   reason: "Reason..."
  // }
};


// ============================================================
// HARD FAMILY RULES
//
// These are checked BEFORE AI.
// ============================================================

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


// ============================================================
// HELPERS
// ============================================================

function normaliseTitle(title) {
  return String(title || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function containsAny(text, words) {
  return words.some(word => text.includes(word));
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}


// ============================================================
// KNOWN TITLE CHECK
// ============================================================

function checkKnownTitle(title) {
  const normalised = normaliseTitle(title);

  return KNOWN_TITLES[normalised] || null;
}


// ============================================================
// HARD RULE CHECK
// ============================================================

function checkHardRules(title) {
  const normalised = normaliseTitle(title);

  // Holiday
  if (
    FAMILY_RULES.holiday === "BLOCK" &&
    containsAny(normalised, HOLIDAY_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates a holiday-themed programme or episode, and this family's rules block holiday celebrations.",
      source: "CleanStream family rule engine",
      confidence: "HIGH"
    };
  }

  // Birthday
  if (
    FAMILY_RULES.birthday === "BLOCK" &&
    containsAny(normalised, BIRTHDAY_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates a birthday-themed programme or episode, and this family's rules block birthday celebrations.",
      source: "CleanStream family rule engine",
      confidence: "HIGH"
    };
  }

  // Magic / witchcraft
  if (
    FAMILY_RULES.magic === "BLOCK" &&
    containsAny(normalised, MAGIC_WORDS)
  ) {
    return {
      decision: "RED",
      reason:
        "The title indicates magic, witchcraft, wizardry or supernatural practices, which this family's rules block.",
      source: "CleanStream family rule engine",
      confidence: "HIGH"
    };
  }

  return null;
}


// ============================================================
// AI PROMPT
// ============================================================

function buildPrompt(title) {
  return `
You are CleanStream AI.

You are checking a film, programme or episode ONLY according to this family's content rules.

Do NOT use general age ratings as the deciding factor.
Do NOT judge whether something is generally suitable for children.
Do NOT invent information.
Do NOT claim that you researched the programme unless information is actually provided to you.

If you do not have enough reliable information to make a decision, choose YELLOW.

FAMILY RULES:

- Romance / crushes: ${FAMILY_RULES.romance}
- Dating: ${FAMILY_RULES.dating}
- Sexual content: ${FAMILY_RULES.sexual_content}
- Sexual jokes / innuendo: ${FAMILY_RULES.sexual_jokes}
- LGBTQ romantic / sexual content: ${FAMILY_RULES.lgbtq_romantic}
- Witchcraft / magic / supernatural practices: ${FAMILY_RULES.magic}
- Holiday celebrations: ${FAMILY_RULES.holiday}
- Birthday celebrations: ${FAMILY_RULES.birthday}
- Violence: ${FAMILY_RULES.violence}
- Horror: ${FAMILY_RULES.horror}
- Bad language: ${FAMILY_RULES.bad_language}
- Alcohol / drugs: ${FAMILY_RULES.alcohol_drugs}
- Gambling: ${FAMILY_RULES.gambling}
- Blasphemy: ${FAMILY_RULES.blasphemy}

TITLE TO CHECK:

"${title}"

DECISION RULES:

GREEN:
The programme appears to have no meaningful conflict with the family's rules.

RED:
There is a clear conflict with one or more BLOCK rules.

YELLOW:
You are uncertain, information is incomplete, or something may need a parent's review.

IMPORTANT:
- A clear BLOCK-rule conflict should be RED.
- Do not turn something RED merely because it is exciting, dramatic, silly, or aimed at older children.
- Educational or historical content should be judged by the actual family rules, not automatically treated as bad.
- If you are unsure, choose YELLOW.

Return ONLY valid JSON in exactly this structure:

{
  "decision": "GREEN",
  "reason": "short explanation",
  "confidence": "HIGH"
}

Allowed decision values:
GREEN
YELLOW
RED

Allowed confidence values:
HIGH
MEDIUM
LOW
`;
}


// ============================================================
// EXTRACT JSON FROM AI RESPONSE
// ============================================================

function extractJson(text) {
  if (!text) return null;

  // First try the complete response.
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // Try to find a JSON object inside markdown or extra text.
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}


// ============================================================
// CLEAN AI RESULT
// ============================================================

function cleanAIResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const allowedDecisions = ["GREEN", "YELLOW", "RED"];
  const allowedConfidence = ["HIGH", "MEDIUM", "LOW"];

  const decision = String(result.decision || "").toUpperCase();
  const confidence = String(result.confidence || "").toUpperCase();
  const reason = String(result.reason || "").trim();

  if (!allowedDecisions.includes(decision)) {
    return null;
  }

  return {
    decision,
    reason: reason || "CleanStream could not provide a detailed explanation.",
    confidence: allowedConfidence.includes(confidence)
      ? confidence
      : "LOW",
    source: "CleanStream AI"
  };
}


// ============================================================
// MAIN API
// ============================================================

async function analyseTitle(title, env) {
  if (!title) {
    return {
      decision: "YELLOW",
      reason: "Please enter a programme or episode title.",
      confidence: "LOW",
      source: "CleanStream"
    };
  }

  const normalised = normaliseTitle(title);

  // ----------------------------------------------------------
  // 1. KNOWN FAMILY TITLE
  // ----------------------------------------------------------

  const known = checkKnownTitle(normalised);

  if (known) {
    return {
      decision: known.decision,
      reason: known.reason,
      confidence: "HIGH",
      source: "CleanStream family title list"
    };
  }

  // ----------------------------------------------------------
  // 2. HARD FAMILY RULES
  // ----------------------------------------------------------

  const hardRule = checkHardRules(normalised);

  if (hardRule) {
    return hardRule;
  }

  // ----------------------------------------------------------
  // 3. AI FALLBACK
  // ----------------------------------------------------------

  if (!env.AI) {
    return {
      decision: "YELLOW",
      reason:
        "CleanStream could not run its AI analysis. Parent review is required.",
      confidence: "LOW",
      source: "CleanStream"
    };
  }

  try {
    const prompt = buildPrompt(title);

    const response = await env.AI.run(
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300
      }
    );

    let aiText = "";

    if (typeof response === "string") {
      aiText = response;
    } else if (response && response.response) {
      aiText = response.response;
    } else if (response && response.result) {
      aiText = response.result;
    } else {
      aiText = JSON.stringify(response);
    }

    const aiResult = cleanAIResult(extractJson(aiText));

    if (!aiResult) {
      return {
        decision: "YELLOW",
        reason:
          "CleanStream could not reliably interpret the AI result. Parent review is required rather than guessing.",
        confidence: "LOW",
        source: "CleanStream AI"
      };
    }

    return aiResult;
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


// ============================================================
// WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --------------------------------------------------------
    // API
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // WEBSITE
    // --------------------------------------------------------

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("CleanStream AI is running.", {
      headers: {
        "content-type": "text/plain; charset=UTF-8"
      }
    });
  }
};
