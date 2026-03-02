const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'pair',
  aliases: ['getcode', 'paircode'],
  category: 'utility',
  description: 'Get a WhatsApp pairing code from the official pair site',
  usage: '.pair <phone number> (e.g., .pair 923009842133)',

  async handler(sock, message, args, context = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const phoneNumber = args?.join('')?.trim();

    // Auto-react to the command
    await sock.sendMessage(chatId, {
      react: { text: '⏳', key: message.key }
    });

    if (!phoneNumber) {
      return await sock.sendMessage(chatId, {
        text: '❌ Please provide your phone number.\nExample: .pair 923009842133'
      }, { quoted: message });
    }

    // Validate phone number (basic)
    if (!/^\d+$/.test(phoneNumber)) {
      return await sock.sendMessage(chatId, {
        text: '❌ Invalid phone number. Use only digits, e.g., 923009842133'
      }, { quoted: message });
    }

    try {
      await sock.sendMessage(chatId, {
        text: '⏳ Requesting pairing code from server...'
      }, { quoted: message });

      // Send request to the pairing site
      // We assume the site accepts a POST with form data "number" or similar
      const formData = new URLSearchParams();
      formData.append('number', phoneNumber);
      // You may need to adjust the field name (e.g., 'phone', 'no') based on the site's form
      // Also, the site might require a specific endpoint; here we use the main URL
      const response = await axios.post('https://redxpair.gt.tc/index.php?page=dashboard&i=1', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      // Extract the pairing code from the response
      // This depends on how the site returns the code. Common patterns:
      // - Plain text: the code is the entire response body
      // - JSON: { code: "XXXX" }
      // - HTML: we need to parse it with regex or cheerio
      let pairCode = null;
      const responseText = response.data;

      // Try to parse as JSON first
      try {
        const json = JSON.parse(responseText);
        pairCode = json.code || json.pairCode || json.pairingCode || json.data?.code;
      } catch (e) {
        // Not JSON, treat as plain text
        pairCode = responseText.trim();
      }

      // If still no code, try regex (for HTML responses)
      if (!pairCode || pairCode.length === 0) {
        const match = responseText.match(/(\d{4,})/); // look for a sequence of digits
        if (match) pairCode = match[1];
      }

      if (!pairCode) {
        throw new Error('Could not extract pairing code from server response.');
      }

      await sock.sendMessage(chatId, {
        text: `✅ Your pairing code is: *${pairCode}*\n\nUse it in WhatsApp within 5 minutes.`
      }, { quoted: message });

    } catch (error) {
      console.error('Pair command error:', error);
      await sock.sendMessage(chatId, {
        text: `❌ Failed to get pairing code: ${error.message || 'Unknown error'}`
      }, { quoted: message });
    }
  }
};
