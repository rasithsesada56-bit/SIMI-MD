
export default {
  command: "menu",

  async run({ sock, jid, config }) {
    const menu = `
╭━━━〔 SIMI MD 〕━━━╮
┃
┃ 👑 OWNER : LAKSHITHA
┃ 🤖 BOT : SIMI MD
┃
┣━━ DOWNLOAD MENU ━━
┃
┃ 🎵 .song
┃ 🎬 .video
┃ 🎞️ .movie
┃
┣━━ SOCIAL MEDIA ━━
┃
┃ 📱 .tiktok
┃ 📘 .fb
┃ 📸 .ig
┃
┣━━━━━━━━━━━━━━━━━━
┃ ❤️ POWERED BY SIMI MD
╰━━━━━━━━━━━━━━━━━━╯
`;

    await sock.sendMessage(jid, { text: menu });
  }
};
