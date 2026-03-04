const axios = require('axios');
module.exports = [{
  pattern: "short",
  alias: ["shorturl", "tiny"],
  desc: "Shorten a URL",
  category: "utility",
  react: "🔗",
  filename: __filename,
  use: ".short <url>",
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!args.length) return reply("❌ Please provide URL.\nExample: .short https://example.com");
      
      const url = args[0];
      const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      
      await reply(`✅ *Short URL:*\n${res.data}`);
      
    } catch (e) {
      await reply(`❌ Failed to shorten URL.`);
    }
  }
}];
