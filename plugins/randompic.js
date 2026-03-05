// plugins/randompic.js
const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'randompic',
  aliases: ['randombg', 'randimage'],
  category: 'fun',
  description: 'Get a random picture (from various categories)',
  usage: '.randompic [category] (default: ba)',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const category = args[0]?.toLowerCase() || 'ba';

    await sock.sendPresenceUpdate('composing', chatId);
    await sock.sendMessage(chatId, {
      text: `🔍 Fetching random ${category} image...`,
      ...channelInfo
    }, { quoted: message });

    try {
      const apiUrl = `https://jawad-tech.vercel.app/random/${encodeURIComponent(category)}`;
      
      // First, try to fetch as binary and check content-type
      const response = await axios.get(apiUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'Accept': 'image/*, text/html, */*' }
      });

      const contentType = response.headers['content-type'] || '';

      if (contentType.startsWith('image/')) {
        // Direct image – send it
        const imageBuffer = Buffer.from(response.data);
        await sock.sendMessage(chatId, {
          image: imageBuffer,
          caption: `🖼️ Random ${category} image`,
          ...channelInfo
        }, { quoted: message });
        return;
      }

      // If not an image, it might be HTML – try to extract image URL
      const html = response.data.toString('utf-8');
      
      // Try to find an image URL in the HTML (common patterns)
      const patterns = [
        /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
        /<img[^>]+src="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/i,
        /<a[^>]+href="([^"]+\.(?:jpg|jpeg|png|gif|webp))"/i,
        /(https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|gif|webp))/i
      ];

      let imageUrl = null;
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          imageUrl = match[1];
          break;
        }
      }

      if (!imageUrl) {
        // If still no image, maybe the endpoint itself is the image when accessed directly?
        // Some sites serve the image directly but with HTML error pages. Try appending a random parameter.
        const fallbackUrl = apiUrl + '?t=' + Date.now();
        const fallbackResponse = await axios.get(fallbackUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'Accept': 'image/*' }
        });
        if (fallbackResponse.headers['content-type']?.startsWith('image/')) {
          const imageBuffer = Buffer.from(fallbackResponse.data);
          await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: `🖼️ Random ${category} image`,
            ...channelInfo
          }, { quoted: message });
          return;
        }
        throw new Error('No image URL found');
      }

      // Download the image from extracted URL
      const imgRes = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const imageBuffer = Buffer.from(imgRes.data);

      await sock.sendMessage(chatId, {
        image: imageBuffer,
        caption: `🖼️ Random ${category} image`,
        ...channelInfo
      }, { quoted: message });

    } catch (error) {
      console.error('Randompic error:', error);
      let errorMsg = '❌ Failed to fetch random image. ';
      if (error.response) {
        errorMsg += `Server returned ${error.response.status}.`;
      } else if (error.request) {
        errorMsg += 'No response from server.';
      } else {
        errorMsg += error.message;
      }
      await sock.sendMessage(chatId, {
        text: errorMsg,
        ...channelInfo
      }, { quoted: message });
    }
  }
};
