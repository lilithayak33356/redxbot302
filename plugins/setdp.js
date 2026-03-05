const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
  command: 'setdp',
  aliases: ['setpp', 'setprofile'],
  category: 'owner',
  description: 'Change bot profile picture (image reply or URL)',
  usage: '.setdp <reply to image> or .setdp <image URL>',
  ownerOnly: true,

  async handler(sock, message, args, context) {
    const { chatId, senderIsOwnerOrSudo } = context;

    if (!senderIsOwnerOrSudo) {
      return await sock.sendMessage(chatId, {
        text: '❌ Only owner/sudo can use this command.'
      }, { quoted: message });
    }

    let imageBuffer;

    // Case 1: Reply to an image message
    if (message.message?.imageMessage || message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
      let quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || message.message;
      if (quoted.imageMessage) {
        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        imageBuffer = Buffer.concat(chunks);
      }
    }
    // Case 2: URL provided
    else if (args[0] && (args[0].startsWith('http://') || args[0].startsWith('https://'))) {
      try {
        const response = await axios.get(args[0], { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(response.data);
      } catch (e) {
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
      console.error('SetDP error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Failed to update profile picture: ${error.message}`
      }, { quoted: message });
    }
  }
};
