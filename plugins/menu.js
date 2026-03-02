const settings = require('../settings');
const commandHandler = require('../lib/commandHandler');

module.exports = {
  command: 'menu',
  aliases: ['help', 'cmd'],
  category: 'main',
  description: 'Show interactive menu with category buttons',
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

      return await sock.sendMessage(chatId, {
        text,
        ...channelInfo
      }, { quoted: message });
    }

    // Build main menu with category buttons
    const categories = Array.from(commandHandler.categories.keys()).sort();
    const buttons = categories.map(cat => ({
      buttonId: `cat_${cat}`,
      buttonText: { displayText: cat.toUpperCase() },
      type: 1 // quick reply button
    }));

    // Prepare header text
    const headerText = `╔═══《 *${settings.botName} MENU* 》═══╗\n\n` +
                       `👑 *Owner:* Abdul Rehman Rajpoot & Muzamil Khan\n` +
                       `📌 *Prefix:* ${settings.prefixes.join(', ')}\n` +
                       `📊 *Total Commands:* ${commandHandler.commands.size}\n\n` +
                       `🔽 *Select a category below:*`;

    await sock.sendMessage(chatId, {
      text: headerText,
      footer: `🔗 ${settings.channelLink}`,
      buttons: buttons,
      headerType: 1,
      ...channelInfo
    }, { quoted: message });
  }
};
