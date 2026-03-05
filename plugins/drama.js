// plugins/drama.js
const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'drama',
  aliases: ['dramadl', 'watchdrama'],
  category: 'download',
  description: 'Search and download drama/video directly',
  usage: '.drama <name> [result number]',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    
    if (args.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `🎬 *Drama Downloader*\n\nUsage:\n.drama <drama name> [result number]\n\nExample: .drama sher ep1\nExample with number: .drama sher ep1 2`,
        ...channelInfo
      }, { quoted: message });
    }

    let index = 1; // default first result
    let query = args.join(' ');
    
    // Check if last argument is a number
    const lastArg = args[args.length - 1];
    if (!isNaN(lastArg) && args.length > 1) {
      index = parseInt(lastArg);
      query = args.slice(0, -1).join(' ');
    }

    await sock.sendPresenceUpdate('composing', chatId);
    await sock.sendMessage(chatId, {
      text: `🔍 Searching for "${query}"...`,
      ...channelInfo
    }, { quoted: message });

    try {
      // Step 1: Search using the provided API
      const searchUrl = `https://jawad-tech.vercel.app/search/youtube?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      // Parse search results (handle different response structures)
      let results = [];
      if (Array.isArray(searchRes.data)) {
        results = searchRes.data;
      } else if (searchRes.data?.data && Array.isArray(searchRes.data.data)) {
        results = searchRes.data.data;
      } else if (searchRes.data?.results && Array.isArray(searchRes.data.results)) {
        results = searchRes.data.results;
      } else if (searchRes.data?.items && Array.isArray(searchRes.data.items)) {
        results = searchRes.data.items;
      }

      if (results.length === 0) {
        // Try a more lenient search (remove special characters)
        const simpleQuery = query.replace(/[^a-zA-Z0-9 ]/g, '');
        if (simpleQuery !== query) {
          const fallbackUrl = `https://jawad-tech.vercel.app/search/youtube?q=${encodeURIComponent(simpleQuery)}`;
          const fallbackRes = await axios.get(fallbackUrl, { timeout: 15000 });
          if (Array.isArray(fallbackRes.data)) results = fallbackRes.data;
          else if (fallbackRes.data?.data) results = fallbackRes.data.data;
          else if (fallbackRes.data?.results) results = fallbackRes.data.results;
          else if (fallbackRes.data?.items) results = fallbackRes.data.items;
        }
      }

      if (results.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No results found. Try a different search term (e.g., use full episode name).',
          ...channelInfo
        }, { quoted: message });
      }

      if (index < 1 || index > results.length) {
        return await sock.sendMessage(chatId, {
          text: `❌ Invalid number. Use 1-${results.length}`,
          ...channelInfo
        }, { quoted: message });
      }

      const selected = results[index - 1];
      // Extract video URL (handle different field names)
      const videoUrl = selected.url || selected.link || selected.videoUrl || 
                      (selected.id ? `https://youtube.com/watch?v=${selected.id}` : null);
      if (!videoUrl) {
        throw new Error('Could not extract video URL from result');
      }

      const title = selected.title || selected.name || 'Unknown';
      const thumbnail = selected.thumbnail || selected.thumbnails?.default?.url || selected.thumb;

      // Step 2: Get download link using the download API
      await sock.sendMessage(chatId, {
        text: `⏳ Fetching download for *${title}*...`,
        ...channelInfo
      }, { quoted: message });

      const downloadApiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(videoUrl)}`;
      const dlRes = await axios.get(downloadApiUrl, { timeout: 60000 });

      let videoDlUrl = null;
      if (dlRes.data?.downloadUrl) videoDlUrl = dlRes.data.downloadUrl;
      else if (dlRes.data?.url) videoDlUrl = dlRes.data.url;
      else if (dlRes.data?.link) videoDlUrl = dlRes.data.link;
      else if (dlRes.data?.video) videoDlUrl = dlRes.data.video;
      else if (typeof dlRes.data === 'string' && dlRes.data.startsWith('http')) videoDlUrl = dlRes.data;

      if (!videoDlUrl) {
        throw new Error('Could not extract download URL from response');
      }

      // Step 3: Send video with thumbnail and info
      const caption = `🎬 *${title}*\n\n📥 *Downloaded via ${settings.botName}*\n📢 Channel: ${settings.channelLink || 'Not set'}`;
      
      // Prepare message options with thumbnail if available
      const messageOptions = {
        video: { url: videoDlUrl },
        mimetype: 'video/mp4',
        caption: caption,
        contextInfo: {
          externalAdReply: {
            title: title.slice(0, 30),
            body: settings.botName,
            thumbnailUrl: thumbnail || '',
            mediaType: 2,
            mediaUrl: videoDlUrl,
            sourceUrl: videoDlUrl
          }
        },
        ...channelInfo
      };

      await sock.sendMessage(chatId, messageOptions, { quoted: message });

    } catch (error) {
      console.error('Drama command error:', error);
      let errorMsg = '❌ Failed to fetch drama.\n';
      if (error.response) {
        errorMsg += `API returned ${error.response.status}`;
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
