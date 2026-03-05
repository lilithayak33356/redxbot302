// plugins/pair.js
const axios = require('axios');

module.exports = {
  command: 'pair',
  aliases: ['getcode', 'paircode'],
  category: 'general',          // Public category so it shows in menu
  description: 'Get WhatsApp pairing code (public)',
  usage: '.pair <phone_number> (e.g., .pair 61468259338)',
  ownerOnly: false,             // Allow everyone to use

  async handler(sock, message, args, context) {
    const { chatId } = context;   // No owner check needed
    const number = args[0]?.trim();

    if (!number) {
      return await sock.sendMessage(chatId, {
        text: '❌ Please provide your phone number.\nExample: .pair 61468259338'
      }, { quoted: message });
    }

    // Basic validation: only digits allowed, no + or spaces
    if (!/^\d+$/.test(number)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Invalid number. Use only digits (no +, spaces, or dashes).'
      }, { quoted: message });
    }

    // Optional: Add simple rate limiting per user (basic in‑memory)
    // This prevents spamming – adjust as needed
    const rateLimit = new Map();
    const now = Date.now();
    const lastUsed = rateLimit.get(chatId);
    if (lastUsed && now - lastUsed < 10000) { // 10 seconds cooldown
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

      // Handle different possible response formats
      const code = response.data?.code || response.data?.pairingCode;
      if (code) {
        await sock.sendMessage(chatId, {
          text: `✅ *Pairing Code Generated*\n\n📱 Number: ${number}\n🔑 Code: ${code}\n\n⏱️ This code expires in 60 seconds.`
        }, { quoted: message });
      } else {
        console.log('Unexpected API response:', response.data);
        await sock.sendMessage(chatId, {
          text: '❌ Backend returned an unexpected response. Please try again later.'
        }, { quoted: message });
      }
    } catch (error) {
      console.error('Pair command error:', error.message);
      
      let errorMsg = '❌ Failed to get pairing code.\n';
      if (error.response) {
        // Server responded with an error status
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
