// CleanStream AI
// Your Family Edition
// Smart AI classification + family rules + known titles

// ============================================================
// FAMILY RULES
// ============================================================

const FAMILY_RULES = {
  romance: "BLOCK",
  dating: "BLOCK",
  sexual_content: "BLOCK",
  sexual_jokes: "BLOCK",
  lgbtq_romantic: "BLOCK",
  magic: "BLOCK",
  holiday: "BLOCK",
  birthday: "BLOCK",

  // Educational / historical violence is reviewed rather
  // than automatically blocked.
  violence: "REVIEW",

  horror: "BLOCK",
  bad_language: "REVIEW",
  alcohol_drugs: "BLOCK",
  gambling: "BLOCK",
  blasphemy: "BLOCK"
};


// ============================================================
// KNOWN TITLES
//
// These are titles YOU already know.
// They override the AI.
//
// Add more as you test programmes.
//
// GREEN = approved
// RED   = not approved
// YELLOW = parent review
// ============================================================

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


// ============================================================
// HARD RULE WORDS
//
// These are checked before AI.
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
// HARD FAMILY RULE CHECK
// ============================================================

function checkHardRules(title) {
  const normalised = normaliseTitle(title);

  // ----------------------------------------------------------
  // HOLIDAYS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // BIRTHDAYS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // MAGIC / WITCHCRAFT
  // ----------------------------------------------------------

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


// ============================================================
// AI PROMPT
// ============================================================

function buildPrompt(title) {
  return `
You are CleanStream AI, a family-specific content screening system.

Your job is NOT to decide whether a programme is generally suitable
for children.

Your job is to check the programme against THIS FAMILY'S RULES.

TITLE:
"${title}"

============================================================
FAMILY RULES
============================================================

ROMANCE / CRUSHES:
${FAMILY_RULES.romance}

DATING:
${FAMILY_RULES.dating}

SEXUAL CONTENT:
${FAMILY_RULES.sexual_content}

SEXUAL JOKES / INNUENDO:
${FAMILY_RULES.sexual_jokes}

LGBTQ ROMANTIC OR SEXUAL CONTENT:
${FAMILY_RULES.lgbtq_romantic}

MAGIC / WITCHCRAFT / SUPERNATURAL PRACTICES:
${FAMILY_RULES.magic}

HOLIDAY CELEBRATIONS:
${FAMILY_RULES.holiday}

BIRTHDAY CELEBRATIONS:
${FAMILY_RULES.birthday}

VIOLENCE:
${FAMILY_RULES.violence}

HORROR:
${FAMILY_RULES.horror}

BAD LANGUAGE:
${FAMILY_RULES.bad_language}

ALCOHOL / DRUGS:
${FAMILY_RULES.alcohol_drugs}

GAMBLING:
${FAMILY_RULES.gambling}

BLASPHEMY:
${FAMILY_RULES.blasphemy}

============================================================
CLASSIFICATION
============================================================

For EACH category decide whether the content is:

YES
NO
UNCERTAIN

If YES, also estimate severity:

NONE
MILD
MODERATE
STRONG
UNKNOWN

Consider the CONTEXT.

Possible context:

HISTORICAL_EDUCATIONAL
FICTIONAL
FANTASY
REAL_WORLD
HUMOROUS_PARODY
UNKNOWN

Possible content type:

EDUCATIONAL
DOCUMENTARY
FICTION
REALITY
COMEDY
ANIMATION
OTHER
UNKNOWN

============================================================
IMPORTANT RULES
============================================================

1. Do not invent facts.

2. Do not claim you researched the programme if you did not.

3. Do not automatically treat all violence as RED.

4. Historical or educational violence may be treated differently
   from entertainment violence.

5. If a category is uncertain, mark it UNCERTAIN.

6. If there is a clear conflict with a BLOCK rule, the final
   decision should normally be RED.

7. If a BLOCK category may be present but you are not confident,
   use YELLOW rather than guessing.

8. If only a REVIEW category is present, use YELLOW unless there
   is another clear BLOCK conflict.

9. The family's rules are more important than normal age ratings.

10. Do not assume something is acceptable simply because it is
    made for children.

11. Do not assume something is unacceptable simply because it is
    dramatic, funny, exciting, old-fashioned or educational.

12. If there is not enough reliable information to decide,
    choose YELLOW.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{
  "decision": "GREEN",
  "reason": "short explanation",
  "confidence": "HIGH",
  "content_type": "FICTION",
  "context": "FICTIONAL",
  "categories": {
    "romance": {
      "presence": "NO",
      "severity": "NONE"
    },
    "dating": {
      "presence": "NO",
      "severity": "NONE"
    },
    "sexual_content": {
      "presence": "NO",
      "severity": "NONE"
    },
    "sexual_jokes": {
      "presence": "NO",
      "severity": "NONE"
    },
    "lgbtq_romantic": {
      "presence": "NO",
      "severity": "NONE"
    },
    "magic": {
      "presence": "NO",
      "severity": "NONE"
    },
    "holiday": {
      "presence": "NO",
      "severity": "NONE"
    },
    "birthday": {
      "presence": "NO",
      "severity": "NONE"
    },
    "violence": {
      "presence": "NO",
      "severity": "NONE"
    },
    "horror": {
      "presence": "NO",
      "severity": "NONE"
    },
    "bad_language": {
      "presence": "NO",
      "severity": "NONE"
    },
    "alcohol_drugs": {
      "presence": "NO",
      "severity": "NONE"
    },
    "gambling": {
      "presence": "NO",
      "severity": "NONE"
    },
    "blasphemy": {
      "presence": "NO",
      "severity": "NONE"
    }
  }
}
`;
}


// ============================================================
// EXTRACT JSON
// ============================================================

function extractJson(text) {
  if (!text) return null;

  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (_) {
    return null;
  }
}


// ============================================================
// NORMALISE AI RESULT
// ============================================================

function normaliseAIResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const decision = String(result.decision || "").toUpperCase();

  if (!["GREEN", "YELLOW", "RED"].includes(decision)) {
    return null;
  }

  const confidenceValue =
    String(result.confidence || "LOW").toUpperCase();

  const
