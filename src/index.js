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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

function containsAny(text, words) {
  return words.some(word => text.includes(word));
}

function hardRule(title) {
  const t = normaliseTitle(title);

  if (
    FAMILY_RULES.holiday === "BLOCK" &&
    containsAny(t, HOLIDAY_WORDS)
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
    containsAny(t, BIRTHDAY_WORDS)
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
    containsAny(t, MAGIC_WORDS)
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

async function fetchWikipedia(title) {
  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(title) +
      "&format=json&origin=*";

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "user-agent": "CleanStreamAI/0.3"
      }
    });

    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json();
    const first = searchData?.query?.search?.[0];

    if (!first) return null;

    const summaryUrl =
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(first.title.replace(/ /g, "_"));

    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        "user-agent": "CleanStreamAI/0.3"
      }
    });

    if (!summaryResponse.ok) return null;

    const summary = await summaryResponse.json();

    return {
      source: "Wikipedia",
      title: summary.title || first.title,
      extract: summary.extract || ""
    };
  } catch (_) {
    return null;
  }
}

async function fetchTVMaze(title) {
  try {
    const url =
      "https://api.tvmaze.com/search/shows?q=" +
      encodeURIComponent(title);

    const response = await fetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const first = data?.[0]?.show;

    if (!first) return null;

    return {
      source: "TVmaze",
      title: first.name || title,
      type: first.type || "",
      genres: Array.isArray(first.genres)
        ? first.genres.join(", ")
        : "",
      summary: String(first.summary || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
      premiered: first.premiered || "",
      status: first.status || ""
    };
  } catch (_) {
    return null;
  }
}

async function getProgrammeInformation(title) {
  const [wikipedia, tvmaze] = await Promise.all([
    fetchWikipedia(title),
    fetchTVMaze(title)
  ]);

  return {
    wikipedia,
    tvmaze
  };
}

function buildPrompt(title, information) {
  return `You are CleanStream AI, a family-specific content screening system.

Analyse the programme/movie/episode named "${title}" using the information supplied below.

The supplied information comes from internet sources.

Do not invent details that are not supported by the information.

FAMILY RULES:

${JSON.stringify(FAMILY_RULES, null, 2)}

SOURCE INFORMATION:

${JSON.stringify(information, null, 2)}

IMPORTANT:

- Judge against this family's rules, not a general age rating.
- Romance/crushes, dating, sexual content, sexual jokes, LGBTQ romantic/sexual content, magic, holidays, birthdays, alcohol/drugs, gambling and blasphemy are BLOCK categories.
- Violence is REVIEW, so educational/historical violence should normally be YELLOW rather than automatically RED.
- If a BLOCK category is clearly present, return RED.
- If a BLOCK category may be present but the evidence is incomplete, return YELLOW.
- If there is no meaningful conflict with the family rules, return GREEN.
- If the information is insufficient, return YELLOW.
- Do not claim you researched anything beyond the supplied source information.

Return ONLY valid JSON in this form:

{
  "decision": "GREEN",
  "reason": "short clear explanation",
  "confidence": "HIGH",
  "content_type": "ANIMATION",
  "context": "REAL_WORLD",
  "categories": {
    "romance": {"presence":"NO","severity":"NONE"},
    "dating": {"presence":"NO","severity":"NONE"},
    "sexual_content": {"presence":"NO","severity":"NONE"},
    "sexual_jokes": {"presence":"NO","severity":"NONE"},
    "lgbtq_romantic": {"presence":"NO","severity":"NONE"},
    "magic": {"presence":"NO","severity":"NONE"},
    "holiday": {"presence":"NO","severity":"NONE"},
    "birthday": {"presence":"NO","severity":"NONE"},
    "violence": {"presence":"NO","severity":"NONE"},
    "horror": {"presence":"NO","severity":"NONE"},
    "bad_language": {"presence":"NO","severity":"NONE"},
    "alcohol_drugs": {"presence":"NO","severity":"NONE"},
    "gambling": {"presence":"NO","severity":"NONE"},
    "blasphemy": {"presence":"NO","severity":"NONE"}
  }
}
`;
}

function parseAI(text) {
  if (!text) return null;

  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start < 0 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

async function analyse(title, env) {
  if (!title || !String(title).trim()) {
    return {
      decision: "YELLOW",
      reason: "Please enter a programme or episode title.",
      confidence: "LOW",
      source: "CleanStream"
    };
  }

  const known = KNOWN_TITLES[normaliseTitle(title)];

  if (known) {
    return {
      ...known,
      confidence: "HIGH",
      source: "CleanStream family title list"
    };
  }

  const hard = hardRule(title);

  if (hard) return hard;

  // Get real programme information from the internet.
  const information = await getProgrammeInformation(title);

  const hasInformation = Boolean(
    information.wikipedia || information.tvmaze
  );

  if (!hasInformation) {
    return {
      decision: "YELLOW",
      reason:
        "CleanStream could not find reliable programme information for this title, so it will not guess.",
      confidence: "LOW",
      source: "CleanStream internet information search"
    };
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
            content: buildPrompt(title, information)
          }
        ],
        max_tokens: 1200
      }
    );

    const text =
      typeof response === "string"
        ? response
        : response?.response ||
          response?.result ||
          JSON.stringify(response);

    const result = parseAI(text);

    if (
      !result ||
      !["GREEN", "YELLOW", "RED"].includes(
        String(result.decision || "").toUpperCase()
      )
    ) {
      return {
        decision: "YELLOW",
        reason:
          "CleanStream could not reliably interpret the AI analysis. Parent review is required rather than guessing.",
        confidence: "LOW",
        source: "CleanStream AI"
      };
    }

    return {
      title,
      decision: String(result.decision).toUpperCase(),
      reason:
        String(
          result.reason ||
            "CleanStream completed its analysis."
        ).trim(),
      confidence: String(
        result.confidence || "MEDIUM"
      ).toUpperCase(),
      content_type: result.content_type || "UNKNOWN",
      context: result.context || "UNKNOWN",
      categories: result.categories || {},
      source:
        "CleanStream AI + internet programme information"
    };
  } catch (_) {
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

      return jsonResponse({
        title: title || "",
        ...(await analyse(title, env))
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "CleanStream AI is running.",
      {
        headers: {
          "content-type":
            "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
