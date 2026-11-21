
export default {
  command: "ig",

  async run({ sock, jid, query }) {
    if (!query) {
      return sock.sendMessage(jid, {
        text: "📸 Usage: .ig Instagram post link"
      });
    }

    try {
      const url = new URL(query);

      const validHosts = [
        "instagram.com",
        "www.instagram.com"
      ];

      if (!validHosts.includes(url.hostname)) {
        return sock.sendMessage(jid, {
          text: "❌ Please provide a valid Instagram link."
        });
      }

      await sock.sendMessage(jid, {
        text:
          "📸 *SIMI MD INSTAGRAM*\n\n" +
          "Instagram link received successfully.\n\n" +
          "Use Instagram's authorized download or sharing options for the media.\n\n" +
          "🔗 " + query
      });

    } catch (error) {
      await sock.sendMessage(jid, {
        text: "❌ Invalid Instagram link."
      });
    }
  }
};
