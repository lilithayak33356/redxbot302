const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('stickers-formatter');

module.exports = {
  command: 'sticker',
  aliases: ['s', 'sk'],
  category: 'stickers',
  description: 'Create a sticker from an image or video',
  usage: '.sticker (reply to image/video) [type]',

  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted || !(quoted.imageMessage || quoted.videoMessage)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Reply to an image or video.',
        ...channelInfo
      }, { quoted: message });
    }

    // Optional sticker type from args (default, full, circle, rounded, crop)
    const typeArg = args[0]?.toLowerCase();
    const typeMap = {
      default: StickerTypes.DEFAULT,
      full: StickerTypes.FULL,
      circle: StickerTypes.CIRCLE,
      rounded: StickerTypes.ROUNDED,
      crop: StickerTypes.CROPPED
    };
    const stickerType = typeMap[typeArg] || StickerTypes.DEFAULT;

    try {
      const mediaType = quoted.imageMessage ? 'image' : 'video';
      const stream = await downloadContentFromMessage(
        quoted.imageMessage || quoted.videoMessage,
        mediaType
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Create sticker with stickers-formatter
      const sticker = new Sticker(buffer, {
        pack: 'REDX Stickers',
        author: 'Abdul Rehman & Muzamil',
        type: stickerType,
        quality: 80,
        categories: ['🤖', '✨']
      });

      const stickerBuffer = await sticker.toBuffer();

      await sock.sendMessage(chatId, {
        sticker: stickerBuffer,
        ...channelInfo
      }, { quoted: message });

    } catch (error) {
      console.error('Sticker creation error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to create sticker.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
