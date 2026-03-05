// plugins/wife.js
module.exports = {
  command: 'wife',
  aliases: ['biwi'],
  category: 'fun',
  description: 'Pick a random group member as your wife',
  usage: '.wife',
  
  async handler(sock, message, args, context) {
    const { chatId, isGroup } = context;
    
    if (!isGroup) {
      return await sock.sendMessage(chatId, {
        text: '❌ This command can only be used in groups!'
      }, { quoted: message });
    }
    
    try {
      const groupMetadata = await sock.groupMetadata(chatId);
      const participants = groupMetadata.participants;
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const eligible = participants.filter(p => p.id !== botNumber);
      
      if (eligible.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No eligible members found.'
        }, { quoted: message });
      }
      
      const randomMember = eligible[Math.floor(Math.random() * eligible.length)];
      const mention = randomMember.id;
      
      await sock.sendMessage(chatId, {
        text: `💖 *Congratulations!*\n\nYour wife is: @${mention.split('@')[0]}\n\n🤵 May your marriage be blessed!`,
        mentions: [mention]
      }, { quoted: message });
      
    } catch (error) {
      console.error('Wife command error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Failed to pick a wife. Try again later.'
      }, { quoted: message });
    }
  }
};
