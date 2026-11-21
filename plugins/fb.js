
import axios from "axios";

export default {
  command: "fb",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "📘 Usage: .fb Facebook video link"
      });
    }

    try {
      const url = new URL(query);

      const validHost = [
        "facebook.com",
        "www.facebook.com",
        "m.facebook.com",
        "fb.watch"
      ];

      if (!validHost.includes(url.hostname)) {
        return sock.sendMessage(jid, {
          text: "❌ Please provide a valid Facebook link."
        });
      }

      await sock.sendMessage(jid, {
        text: "⏳ Checking Facebook video..."
      });

      await sock.sendMessage(jid, {
        text:
          "📘 *SIMI MD FACEBOOK*\n\n" +
          "Facebook video link received successfully.\n\n" +
          "For video downloads, use an authorized source or the original Facebook download option when available.\n\n" +
          "🔗 " + query
      });

    } catch (error) {
      await sock.sendMessage(jid, {
        text: "❌ Invalid Facebook link."
      });
    }
  }
};
