const settings = require('../settings');
const commandHandler = require('../lib/commandHandler');
const axios = require('axios');

// Image URL from the user
const MENU_IMAGE_URL = 'https://d.uguu.se/rdsobzqr.jpg';

module.exports = {
  command: 'menu',
  aliases: ['help', 'cmd', 'start'],
  category: 'main',
  description: 'Show professional interactive menu',
  usage: '.menu [category]',

  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const category = args[0]?.toLowerCase();

    // If a category is specified, show commands of that category
    if (category) {
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

    // Prepare menu text with professional formatting
    const totalCommands = commandHandler.commands.size;
    const prefix = settings.prefixes[0];

    // Create a clean, visually appealing menu text
    const menuText = `╭══════════════════════════╮\n` +
                     `│    *${settings.botName}*     │\n` +
                     `╰══════════════════════════╯\n\n` +
                     `✦ *Prefix:* \`${prefix}\`\n` +
                     `✦ *Total Commands:* ${totalCommands}\n` +
                     `✦ *Status:* 🟢 Online\n\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `📂 *Available Categories*\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                     categories.map(cat => {
                       const count = commandHandler.getCommandsByCategory(cat).length;
                       return `▸ *${cat}* — ${count} command${count !== 1 ? 's' : ''}`;
                     }).join('\n') +
                     `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `🔽 *Tap a button below* to view category details.\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━`;

    // Fetch the image buffer
    let imageBuffer;
    try {
      const response = await axios.get(MENU_IMAGE_URL, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    } catch (imgErr) {
      console.error('Failed to fetch menu image:', imgErr.message);
      // Fallback: send only text if image fails
      return await sock.sendMessage(chatId, {
        text: menuText,
        footer: `🔗 ${settings.channelLink}`,
        buttons: buttons,
        headerType: 1,
        ...channelInfo
      }, { quoted: message });
    }

    // Send image with caption and buttons
    await sock.sendMessage(chatId, {
      image: imageBuffer,
      caption: menuText,
      footer: `🔗 ${settings.channelLink}`,
      buttons: buttons,
      headerType: 4, // 4 = image + buttons
      ...channelInfo
    }, { quoted: message });
  }
};
