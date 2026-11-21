
import axios from "axios";

export default {
  command: "tiktok",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "📱 Usage: .tiktok TikTok link"
      });
    }

    try {
      const url = new URL(query);

      if (
        !["tiktok.com", "www.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname)
      ) {
        return sock.sendMessage(jid, {
          text: "❌ Please provide a valid TikTok link."
        });
      }

      await sock.sendMessage(jid, {
        text: "⏳ Processing TikTok link..."
      });

      const response = await axios.post(
        "https://www.tikwm.com/api/",
        new URLSearchParams({ url: query }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: 20000
        }
      );

      const data = response.data?.data;
      const video = data?.play || data?.wmplay;

      if (!video) {
        return sock.sendMessage(jid, {
          text: "❌ Video unavailable. Try another public link."
        });
      }

      await sock.sendMessage(jid, {
        video: { url: video },
        caption:
          "📱 *SIMI MD TIKTOK DOWNLOADER*\n\n" +
          "🎬 " + (data.title || "TikTok video") +
          "\n\n❤️ SIMI MD"
      });

    } catch (error) {
      console.error("TikTok error:", error.message);

      await sock.sendMessage(jid, {
        text: "❌ TikTok download failed. Check the link and try again."
      });
    }
  }
};
