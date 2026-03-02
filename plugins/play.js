const axios = require('axios');

module.exports = {
  command: 'play',
  aliases: ['plays', 'music'],
  category: 'music',
  description: 'Search and download a song as MP3 from the new music API',
  usage: '.play <song name>',
  
  async handler(sock, message, args, context = {}) {
    const chatId = context.chatId || message.key.remoteJid;
    const searchQuery = args.join(' ').trim();

    // Helper function to wait
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function for API calls with retry logic
    const apiCallWithRetry = async (url, maxRetries = 3, baseDelay = 2000) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add delay before each request to respect rate limits
          await wait(1000);
          
          const response = await axios.get(url, { 
            timeout: 45000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });
          
          return response;
        } catch (error) {
          const isRateLimited = error.response?.status === 429 || 
                               error.code === 'ECONNABORTED' ||
                               error.code === 'ETIMEDOUT';
          
          if (attempt === maxRetries) {
            throw error;
          }

          if (isRateLimited) {
            // Exponential backoff for rate limiting
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Rate limited or timeout. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
            await wait(delay);
          } else {
            throw error;
          }
        }
      }
    };

    try {
      if (!searchQuery) {
        return await sock.sendMessage(chatId, {
          text: "*Which song do you want to play?*\nUsage: .play <song name>"
        }, { quoted: message });
      }

      await sock.sendMessage(chatId, {
        text: "🔍 *Searching for your song...*"
      }, { quoted: message });

      // ------------------------------------------------------------
      // NEW API IMPLEMENTATION (as of 8th June 2025)
      // Search using the specified engine (seevn returns direct MP3)
      // ------------------------------------------------------------
      const searchEngine = 'seevn'; // You can change this to: gaama, seevn, hunjama, mtmusic, wunk
      const searchUrl = `https://musicapi.x007.workers.dev/search?q=${encodeURIComponent(searchQuery)}&searchEngine=${searchEngine}`;
      const searchResponse = await apiCallWithRetry(searchUrl);

      // Check if search was successful and returned results
      if (!searchResponse.data?.status === 200 || !searchResponse.data?.response?.length) {
        return await sock.sendMessage(chatId, {
          text: "❌ *No songs found!*\nTry a different search term or engine."
        }, { quoted: message });
      }

      const topResult = searchResponse.data.response[0];
      const songId = topResult.id;
      const songTitle = topResult.title;
      const coverImageUrl = topResult.img; // Cover image URL

      await sock.sendMessage(chatId, {
        text: `✅ *Found!*\n\n🎵 *Song:* ${songTitle}\n\n⏳ *Downloading...*`
      }, { quoted: message });

      // Wait before making download request to respect rate limits
      await wait(1500);

      // Fetch the actual audio file URL
      const fetchUrl = `https://musicapi.x007.workers.dev/fetch?id=${songId}`;
      const fetchResponse = await apiCallWithRetry(fetchUrl, 3, 3000);

      if (!fetchResponse.data?.status === 200 || !fetchResponse.data?.response) {
        return await sock.sendMessage(chatId, {
          text: "❌ *Download failed!*\nThe API couldn't fetch the audio. Try again later."
        }, { quoted: message });
      }

      const audioUrl = fetchResponse.data.response; // Direct MP3 URL (for seevn engine)

      // Fetch cover image as buffer (if available)
      let thumbnailBuffer = null;
      if (coverImageUrl) {
        try {
          await wait(1000); // Respect rate limits
          const imgResponse = await axios.get(coverImageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 
          });
          thumbnailBuffer = Buffer.from(imgResponse.data);
        } catch (imgError) {
          console.error('Failed to fetch cover image:', imgError.message);
        }
      }

      // Send audio file
      await sock.sendMessage(chatId, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: `${songTitle}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: songTitle,
            body: 'Music', // Artist info not provided by new API
            thumbnail: thumbnailBuffer,
            mediaType: 2,
            mediaUrl: '', // No Spotify URL anymore
            sourceUrl: '' // Could add search URL if desired
          }
        }
      }, { quoted: message });

    } catch (error) {
      console.error('Play Command Error:', error);
      
      let errorMsg = "❌ *Download failed!*\n\n";
      
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMsg += "*Reason:* Connection timeout\nThe API took too long to respond.";
      } else if (error.response?.status === 429) {
        errorMsg += "*Reason:* Rate limit exceeded\nToo many requests. Please wait a minute and try again.";
      } else if (error.response) {
        errorMsg += `*Status:* ${error.response.status}\n*Error:* ${error.response.statusText}`;
      } else {
        errorMsg += `*Error:* ${error.message}`;
      }
      
      errorMsg += "\n\n💡 *Tip:* Wait 10-15 seconds between requests to avoid rate limits.";

      await sock.sendMessage(chatId, {
        text: errorMsg
      }, { quoted: message });
    }
  }
};
