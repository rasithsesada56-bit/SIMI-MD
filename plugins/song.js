
import yts from "yt-search";

export default {
  command: "song",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "🎵 Usage: .song song name"
      });
    }

    await sock.sendMessage(jid, {
      text: "🔎 Searching for: " + query
    });

    try {
      const result = await yts(query);
      const video = result.videos?.[0];

      if (!video) {
        return sock.sendMessage(jid, {
          text: "❌ Song not found."
        });
      }

      await sock.sendMessage(jid, {
        text:
          "🎵 *SIMI MD SONG SEARCH*\n\n" +
          "📌 Title: " + video.title + "\n" +
          "👤 Channel: " + video.author.name + "\n" +
          "⏱️ Duration: " + video.timestamp + "\n" +
          "🔗 Link: " + video.url + "\n\n" +
          "Download only from authorized sources."
      });

    } catch (error) {
      console.error("Song error:", error);
      await sock.sendMessage(jid, {
        text: "❌ Song search failed. Try again."
      });
    }
  }
};
