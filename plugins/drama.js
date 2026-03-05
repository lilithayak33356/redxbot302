// plugins/drama.js
const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'drama',
  aliases: ['dramadl', 'watchdrama'],
  category: 'download',
  description: 'Search and download drama/video directly',
  usage: '.drama <name> [number]',
  
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
      // Step 1: Search
      const searchUrl = `https://jawad-tech.vercel.app/search/youtube?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      let results = searchRes.data;
      if (searchRes.data?.data) results = searchRes.data.data;
      if (searchRes.data?.results) results = searchRes.data.results;

      if (!Array.isArray(results) || results.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No results found. Try a different search term.',
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
      const videoUrl = selected.url || selected.link || `https://youtube.com/watch?v=${selected.id}`;
      const title = selected.title || selected.name || 'Unknown';
      const thumbnail = selected.thumbnail || selected.thumbnails?.default?.url;

      // Step 2: Get download link
      await sock.sendMessage(chatId, {
        text: `⏳ Fetching download for *${title}*...`,
        ...channelInfo
      }, { quoted: message });

      const downloadUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(videoUrl)}`;
      const dlRes = await axios.get(downloadUrl, { timeout: 60000 });

      let videoDlUrl = dlRes.data?.downloadUrl || dlRes.data?.url || dlRes.data?.link || dlRes.data?.video;
      if (typeof dlRes.data === 'string' && dlRes.data.startsWith('http')) {
        videoDlUrl = dlRes.data;
      }

      if (!videoDlUrl) {
        throw new Error('Could not extract download URL');
      }

      // Step 3: Send video (as video message with thumbnail)
      const messageOptions = {
        video: { url: videoDlUrl },
        mimetype: 'video/mp4',
        caption: `🎬 *${title}*\n\n📥 *Downloaded via ${settings.botName}*\n📢 Channel: ${settings.channelLink || 'Not set'}`,
        contextInfo: {
          externalAdReply: {
            title: title.slice(0, 30),
            body: settings.botName,
            thumbnailUrl: thumbnail,
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
      await sock.sendMessage(chatId, {
        text: '❌ Failed to fetch drama. The API may be down or the video unavailable.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};
