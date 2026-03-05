const yts = require('yt-search');
const axios = require('axios');

const fetchJson = async (url, options) => {
    try {
        options = options || {};
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
            },
            ...options,
        });
        return res.data;
    } catch (err) {
        console.error('[ ❌ ] fetchJson error:', err);
        return err;
    }
};

// ==================== PLAY COMMAND (ORIGINAL) ====================
module.exports = {
  command: 'play',
  aliases: ['song', 'mp3'],
  category: 'music',
  description: 'Stream audio from YouTube',
  usage: '.play <song name>',
  
  async handler(sock, message, args) {
    const chatId = message.key.remoteJid;
    const query = args.join(' ');
    
    if (!query) {
      return await sock.sendMessage(chatId, { 
        text: '❌ Please provide a song name!\nExample: .play Moye Moye' 
      });
    }

    try {
      // 1. SEARCH YOUTUBE
      const searchResult = await yts(query);
      const video = searchResult.videos[0];
      
      if (!video) {
        return await sock.sendMessage(chatId, { 
          text: '❌ No results found for your query.' 
        });
      }

      // 2. SEND THUMBNAIL WITH INFO
      const caption = `*🎵 ${video.title}*\n\n⏱️ Duration: ${video.timestamp}\n📢 Channel: ${video.author.name}\n\n🔄 Streaming your audio...`;
      
      await sock.sendMessage(chatId, { 
        image: { url: video.thumbnail },
        caption: caption
      });

      // 3. FETCH STREAM URL FROM API
      const apiUrl = `https://api.qasimdev.dpdns.org/api/loaderto/download?apiKey=qasim-dev&format=mp3&url=${video.url}`;
      const apiResponse = await fetchJson(apiUrl);
      
      if (!apiResponse.success || !apiResponse.data.downloadUrl) {
        throw new Error('Failed to get stream link');
      }

      const streamUrl = apiResponse.data.downloadUrl;

      // 4. STREAM DIRECTLY FROM THE URL
      await sock.sendMessage(chatId, {
        audio: { url: streamUrl },
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`
      });

    } catch (error) {
      console.error('Play command error:', error);
      await sock.sendMessage(chatId, { 
        text: '❌ An error occurred while processing your request.\nPlease try again later.' 
      });
    }
  }
};
