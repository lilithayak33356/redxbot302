// plugins/pair.js
const axios = require('axios');

// Simple in‑memory rate limiting map (outside handler to persist)
const rateLimit = new Map();

module.exports = {
  command: 'pair',
  aliases: ['getcode', 'paircode'],
  category: 'general',
  description: 'Get WhatsApp pairing code (public)',
  usage: '.pair <phone_number> (e.g., .pair 61468259338)',
  ownerOnly: false,

  async handler(sock, message, args, context) {
    const { chatId } = context;
    const number = args[0]?.trim();

    if (!number) {
      return await sock.sendMessage(chatId, {
        text: '❌ Please provide your phone number.\nExample: .pair 61468259338'
      }, { quoted: message });
    }

    if (!/^\d+$/.test(number)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Invalid number. Use only digits (no +, spaces, or dashes).'
      }, { quoted: message });
    }

    // Simple rate limiting: 10 seconds per chat
    const now = Date.now();
    const lastUsed = rateLimit.get(chatId);
    if (lastUsed && now - lastUsed < 10000) {
      return await sock.sendMessage(chatId, {
        text: '⏳ Please wait a few seconds before requesting another code.'
      }, { quoted: message });
    }
    rateLimit.set(chatId, now);

    await sock.sendMessage(chatId, {
      text: `⏳ Requesting pairing code for *${number}*...`
    }, { quoted: message });

    try {
      const apiUrl = `https://redxmainpair-production-6606.up.railway.app/code?number=${number}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });

      const code = response.data?.code || response.data?.pairingCode;
      if (!code) {
        throw new Error('No code in response');
      }

      // First message: full info
      await sock.sendMessage(chatId, {
        text: `> *REDXBOT PAIRING COMPLETED*\n\nYour pairing code is: ${code}`
      }, { quoted: message });

      // Second message: only the code (clean)
      await sock.sendMessage(chatId, {
        text: code
      }, { quoted: message });

    } catch (error) {
      console.error('Pair command error:', error.message);
      let errorMsg = '❌ Failed to get pairing code.\n';
      if (error.response) {
        if (error.response.status === 400) {
          errorMsg += 'Invalid number format.';
        } else if (error.response.status === 429) {
          errorMsg += 'Too many requests. Please try again later.';
        } else {
          errorMsg += `Server error (${error.response.status}).`;
        }
      } else if (error.request) {
        errorMsg += 'No response from backend. It may be down.';
      } else {
        errorMsg += error.message;
      }
      await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
  }
};
