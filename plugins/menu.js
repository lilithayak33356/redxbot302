const settings = require('../settings');
const commandHandler = require('../lib/commandHandler');

module.exports = {
  command: 'menu',
  aliases: ['help', 'cmd'],
  category: 'main',
  description: 'Show all available commands',
  usage: '.menu [category]',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const category = args[0]?.toLowerCase();

    if (category) {
      // Show commands of a specific category
      const commands = commandHandler.getCommandsByCategory(category);
      if (!commands || commands.length === 0) {
        return await sock.sendMessage(chatId, {
          text: `❌ No commands found in category *${category}*`,
          ...channelInfo
        }, { quoted: message });
      }

      let text = `╔═══《 *${category.toUpperCase()}* 》═══╗\n\n`;
      commands.forEach(cmd => {
        const cmdObj = commandHandler.commands.get(cmd);
        text += `║ ✦ *${cmd}* : ${cmdObj?.description || 'No description'}\n`;
      });
      text += `\n╚════════════════════╝\n\n📌 *Total: ${commands.length} commands*`;

      await sock.sendMessage(chatId, {
        text,
        ...channelInfo
      }, { quoted: message });
    } else {
      // Show all categories with command counts
      const categories = Array.from(commandHandler.categories.keys());
      let text = `╔═══《 *${settings.botName} MENU* 》═══╗\n\n`;
      text += `║ *Owner:* Abdul Rehman Rajpoot & Muzamil Khan\n`;
      text += `║ *Prefix:* ${settings.prefixes.join(', ')}\n`;
      text += `║ *Total Commands:* ${commandHandler.commands.size}\n\n`;

      categories.sort().forEach(cat => {
        const cmdList = commandHandler.getCommandsByCategory(cat);
        text += `╠═══《 *${cat.toUpperCase()}* 》═══╣\n`;
        cmdList.slice(0, 5).forEach(cmd => {
          text += `║ ✦ *${cmd}*\n`;
        });
        if (cmdList.length > 5) {
          text += `║ ... and ${cmdList.length - 5} more\n`;
        }
        text += `║ 📌 *Total: ${cmdList.length}*\n\n`;
      });

      text += `╚══════════════════════════╝\n\n`;
      text += `📌 *Use .menu <category> to see full category*\n`;
      text += `🔗 *Channel:* ${settings.channelLink}`;

      await sock.sendMessage(chatId, {
        text,
        ...channelInfo
      }, { quoted: message });
    }
  }
};
