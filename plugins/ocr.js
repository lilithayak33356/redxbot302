const axios = require('axios');
const FormData = require('form-data');
module.exports = [{
  pattern: "ocr",
  alias: ["imagetotext"],
  desc: "Extract text from image",
  category: "utility",
  react: "📝",
  filename: __filename,
  use: ".ocr (reply to image)",
  execute: async (conn, mek, m, { from, reply }) => {
    try {
      const quoted = m.quoted || m;
      const mime = (quoted.msg || quoted).mimetype || '';
      
      if (!mime.startsWith('image')) {
        return reply("❌ Please reply to an image.");
      }
      
      const buffer = await quoted.download();
      const formData = new FormData();
      formData.append('file', buffer, { filename: 'image.jpg' });
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      
      const res = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: {
          ...formData.getHeaders(),
          'apikey': 'helloworld' // Free API key - rate limited
        }
      });
      
      const text = res.data.ParsedResults[0]?.ParsedText;
      if (!text) throw new Error("No text found");
      
      await reply(`📝 *Extracted Text:*\n\n${text}`);
      
    } catch (e) {
      await reply(`❌ OCR failed: ${e.message}`);
    }
  }
}];
