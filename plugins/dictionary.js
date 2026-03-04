const axios = require('axios');
module.exports = [{
  pattern: "define",
  alias: ["dictionary", "meaning"],
  desc: "Get word definition",
  category: "utility",
  react: "📚",
  filename: __filename,
  use: ".define <word>",
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!args.length) return reply("❌ Please provide a word.\nExample: .define hello");
      
      const word = args[0];
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = res.data[0];
      
      let meanings = '';
      data.meanings.slice(0, 3).forEach(m => {
        meanings += `\n*${m.partOfSpeech}*: ${m.definitions[0].definition}`;
      });
      
      const info = `
📖 *${word}*
${meanings}
🔊 *Phonetic:* ${data.phonetic || 'N/A'}
      `;
      
      await reply(info);
      
    } catch (e) {
      await reply(`❌ Word not found.`);
    }
  }
}];
