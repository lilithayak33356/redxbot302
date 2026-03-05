// plugins/botname.js
module.exports = {
  command: 'botname',
  aliases: ['setbotname'],
  category: 'owner',
  description: 'Change bot display name (pushname)',
  usage: '.botname <new name>',
  
  async handler(sock, message, args, context) {
    if (!message.key.fromMe) return;

    const { chatId } = context;
    const newName = args.join(' ').trim();

    if (!newName) {
      return await sock.sendMessage(chatId, {
        text: '❌ Please provide a new name.\nExample: .botname REDXBOT'
      }, { quoted: message });
    }

    try {
      await sock.updateProfileName(newName);
      await sock.sendMessage(chatId, {
        text: `✅ Bot name changed to: *${newName}*`
      }, { quoted: message });
    } catch (error) {
      console.error('BotName error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Failed: ${error.message}`
      }, { quoted: message });
    }
  }
};
