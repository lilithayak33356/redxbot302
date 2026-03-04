const axios = require('axios');
module.exports = [{
  pattern: "soundcloud",
  alias: ["scdl"],
  desc: "Download SoundCloud track",
  category: "downloader",
  react: "🎧",
  filename: __filename,
  use: ".soundcloud <url>",
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!args.length) return reply("❌ Please provide SoundCloud URL.\nExample: .soundcloud https://soundcloud.com/...");
      
      const url = args[0];
      await reply("⏳ Downloading SoundCloud track...");
      
      const res = await axios.get(`https://api.maher-zubair.tech/download/soundcloud?url=${encodeURIComponent(url)}`);
      if (!res.data || !res.data.result) throw new Error("Download failed");
      
      const { title, artist, thumbnail, download } = res.data.result;
      
      await conn.sendMessage(from, {
        audio: { url: download },
        mimetype: "audio/mpeg",
        fileName: `${title} - ${artist}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: artist,
            thumbnailUrl: thumbnail,
            mediaType: 1
          }
        }
      }, { quoted: mek });
      
    } catch (e) {
      await reply(`❌ Error: ${e.message}`);
    }
  }
}];
