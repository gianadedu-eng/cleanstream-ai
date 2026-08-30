export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyse") {
      const title = (url.searchParams.get("title") || "").trim();

      if (!title) {
        return Response.json({ error: "Missing title" }, { status: 400 });
      }

      const results = {
        "green eggs and ham": ["GREEN", "🟢", "Comedy, friendship and positive lessons"],
        "the inbestigators": ["GREEN", "🟢", "Mystery, friendship, teamwork and comedy"],
        "harvey girls forever!": ["GREEN", "🟢", "Friendship, comedy and adventure"],
        "henry danger": ["YELLOW", "🟡", "Crush/romantic material, mild inappropriate humour and cartoon violence"],
        "prince of peoria": ["RED", "🔴", "Crushes/dating, sexual innuendo and a mature joke"],
        "find me in paris": ["RED", "🔴", "Teen romance, LGBTQ theme and time-travel/fantasy"],
        "dive club": ["RED", "🔴", "Romance/flirting and same-sex romantic content"],
        "icarly": ["RED", "🔴", "Sexual jokes/references and mature humour"],
        "how to train your dragon": ["YELLOW", "🟡", "Fantasy/dragons and mild romance"],
        "paddington": ["YELLOW", "🟡", "Very mild romance/kissing, alcohol reference and mild language"]
      };

      const result = results[title.toLowerCase()];

      if (result) {
        return Response.json({
          title,
          decision: result[0],
          emoji: result[1],
          reason: result[2],
          source: "CleanStream calibration dataset"
        });
      }

      return Response.json({
        title,
        decision: "YELLOW",
        emoji: "🟡",
        reason: "This title has not yet been verified by CleanStream. Parent review is required rather than guessing.",
        source: "Not yet verified"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
