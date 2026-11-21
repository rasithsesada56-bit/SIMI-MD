
import axios from "axios";

export default {
  command: "movie",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "🍿 Usage: .movie movie name"
      });
    }

    try {
      await sock.sendMessage(jid, {
        text: "🔎 Searching movie: " + query
      });

      const response = await axios.get(
        "https://www.omdbapi.com/",
        {
          params: {
            apikey: "demo",
            s: query,
            type: "movie"
          },
          timeout: 15000
        }
      );

      const movies = response.data.Search || [];

      if (!movies.length) {
        return sock.sendMessage(jid, {
          text: "❌ Movie not found."
        });
      }

      const results = movies.slice(0, 5).map((movie, index) =>
        `${index + 1}. ${movie.Title}\n` +
        `📅 Year: ${movie.Year}\n` +
        `🎬 Type: ${movie.Type}\n` +
        `🔗 https://www.imdb.com/title/${movie.imdbID}/`
      );

      await sock.sendMessage(jid, {
        text:
          "🍿 *SIMI MD MOVIE SEARCH*\n\n" +
          results.join("\n\n") +
          "\n\n❤️ Powered by SIMI MD"
      });

    } catch (error) {
      console.error("Movie error:", error.message);

      await sock.sendMessage(jid, {
        text: "❌ Movie search failed."
      });
    }
  }
};
