
import yts from "yt-search";

export default {
  command: "video",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "🎬 Usage: .video video name"
      });
    }

    try {
      await sock.sendMessage(jid, {
        text: "🔎 Searching video: " + query
      });

      const result = await yts(query);
      const video = result.videos?.[0];

      if (!video) {
        return sock.sendMessage(jid, {
          text: "❌ Video not found."
        });
      }

      await sock.sendMessage(jid, {
        text:
          "🎬 *SIMI MD VIDEO SEARCH*\n\n" +
          "📌 Title: " + video.title + "\n" +
          "👤 Channel: " + video.author.name + "\n" +
          "⏱️ Duration: " + video.timestamp + "\n" +
          "👁️ Views: " + video.views + "\n\n" +
          "🔗 Video: " + video.url + "\n\n" +
          "Download only from authorized sources."
      });

    } catch (error) {
      console.error(error);

      await sock.sendMessage(jid, {
        text: "❌ Video search failed."
      });
    }
  }
};
