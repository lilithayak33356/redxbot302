// plugins/botdp.js
const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  command: 'botdp',
  aliases: ['setdp'],
  category: 'owner',
  description: 'Change bot profile picture (reply to image or URL)',
  usage: '.botdp <reply to image> or .botdp <image URL>',
  
  async handler(sock, message, args, context) {
    // Only allow the bot's own messages
    if (!message.key.fromMe) {
      return;
    }

    const { chatId } = context;
    let imageBuffer;

    // Check if replying to an image
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted?.imageMessage) {
      const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      imageBuffer = Buffer.concat(chunks);
    }
    // Check if URL provided
    else if (args[0] && (args[0].startsWith('http://') || args[0].startsWith('https://'))) {
      try {
        const response = await axios.get(args[0], { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data);
      } catch {
        return await sock.sendMessage(chatId, {
          text: '❌ Failed to fetch image from URL.'
        }, { quoted: message });
      }
    }
    else {
      return await sock.sendMessage(chatId, {
        text: '❌ Please reply to an image or provide an image URL.'
      }, { quoted: message });
    }

    try {
      await sock.updateProfilePicture(sock.user.id, imageBuffer);
      await sock.sendMessage(chatId, {
        text: '✅ Profile picture updated successfully!'
      }, { quoted: message });
    } catch (error) {
      console.error('BotDP error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Failed: ${error.message}`
      }, { quoted: message });
    }
  }
};
