const QRCode = require('qrcode');
module.exports = [{
  pattern: "qr",
  alias: ["qrcode"],
  desc: "Generate QR code from text",
  category: "utility",
  react: "📱",
  filename: __filename,
  use: ".qr <text>",
  execute: async (conn, mek, m, { from, args, q, reply }) => {
    try {
      if (!args.length) return reply("❌ Please provide text.\nExample: .qr Hello World");
      
      const text = args.join(" ");
      const qrBuffer = await QRCode.toBuffer(text);
      
      await conn.sendMessage(from, {
        image: qrBuffer,
        caption: `✅ QR Code for: ${text}`
      }, { quoted: mek });
      
    } catch (e) {
      await reply(`❌ Failed to generate QR code.`);
    }
  }
}];
