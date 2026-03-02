const axios = require('axios');
const settings = require('../settings'); // For bot name

module.exports = {
  command: 'pair',
  aliases: ['paircode', 'session', 'getsession', 'sessionid'],
  category: 'general',
  description: 'Get a WhatsApp pairing code from REDX server',
  usage: '.pair 923009842133',
  
  async handler(sock, message, args, context = {}) {
    const { chatId, channelInfo } = context;
    const query = args.join('').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: "❌ *Missing Number*\nExample: .pair 923009842133",
        ...channelInfo
      }, { quoted: message });
    }

    const number = query.replace(/[^0-9]/g, '');

    if (number.length < 10 || number.length > 15) {
      return await sock.sendMessage(chatId, {
        text: "❌ *Invalid Format*\nPlease provide the number with country code but without + or spaces.\nExample: 923009842133",
        ...channelInfo
      }, { quoted: message });
    }

    await sock.sendMessage(chatId, {
      text: "⏳ *Requesting pairing code from REDX server...*",
      ...channelInfo
    }, { quoted: message });

    try {
      // Use your REDX pairing backend
      const response = await axios.get(`https://redxmainpair-production.up.railway.app/pair?number=${number}`, {
        timeout: 60000
      });

      // Check response format – adjust based on your backend's actual response
      let pairingCode = null;
      if (response.data && response.data.code) {
        pairingCode = response.data.code;
      } else if (response.data && typeof response.data === 'string') {
        pairingCode = response.data.trim();
      } else if (response.data && response.data.pairingCode) {
        pairingCode = response.data.pairingCode;
      }

      if (!pairingCode || pairingCode.includes("Unavailable") || pairingCode.includes("Error")) {
        throw new Error("Server returned an error or is busy");
      }

      const successText = `✅ *${settings.botName} PAIRING CODE*\n\n` +
                          `Code: *${pairingCode}*\n\n` +
                          `*How to use:*\n` +
                          `1. Open WhatsApp Settings\n` +
                          `2. Tap 'Linked Devices'\n` +
                          `3. Tap 'Link a Device'\n` +
                          `4. Select 'Link with phone number instead'\n` +
                          `5. Enter the code above.\n\n` +
                          `_Code expires in 5 minutes._`;

      await sock.sendMessage(chatId, {
        text: successText,
        ...channelInfo
      }, { quoted: message });

    } catch (error) {
      console.error('Pairing Plugin Error:', error.message);
      
      let errorMsg = "❌ *Pairing Failed*\nReason: ";
      if (error.code === 'ECONNABORTED') {
        errorMsg += "Server timeout. Please try again in a minute.";
      } else if (error.response?.status === 400) {
        errorMsg += "Invalid phone number format.";
      } else if (error.response?.status === 429) {
        errorMsg += "Too many requests. Wait a minute and try again.";
      } else if (error.response?.status === 503) {
        errorMsg += "Server is busy. Try again later.";
      } else {
        errorMsg += "The server is currently offline or busy. Try again later.";
      }

      await sock.sendMessage(chatId, {
        text: errorMsg,
        ...channelInfo
      }, { quoted: message });
    }
  }
};
