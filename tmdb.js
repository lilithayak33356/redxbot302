const axios = require('axios');
module.exports = [{
  pattern: "tv",
  alias: ["tvshow", "series"],
  desc: "Get TV show information",
  category: "search",
  react: "📺",
  filename: __filename,
  use: ".tv <show name>",
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!args.length) return reply("❌ Please provide TV show name.\nExample: .tv Breaking Bad");
      
      const query = args.join(" ");
      await reply("🔍 Searching...");
      
      const searchRes = await axios.get(`https://api.themoviedb.org/3/search/tv?api_key=57203c5cf51e28cb6db2c9969d214007&query=${encodeURIComponent(query)}`);
      if (!searchRes.data.results || searchRes.data.results.length === 0) throw new Error("Show not found");
      
      const show = searchRes.data.results[0];
      
      const info = `
📺 *${show.name}*
📅 *First Air:* ${show.first_air_date || 'N/A'}
📊 *Rating:* ${show.vote_average}/10
📝 *Overview:* ${show.overview?.substring(0, 300)}...
      `;
      
      await conn.sendMessage(from, {
        image: { url: `https://image.tmdb.org/t/p/w500${show.poster_path}` },
        caption: info
      }, { quoted: mek });
      
    } catch (e) {
      await reply(`❌ Error: ${e.message}`);
    }
  }
}];
