// plugins/drama.js
const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'drama',
  aliases: ['dramadl', 'watchdrama'],
  category: 'download',
  description: 'Search and download the first result as video (mp4)',
  usage: '.drama <name>',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const query = args.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: `🎬 *Drama Downloader*\n\nUsage:\n.drama <drama name>\n\nExample: .drama sher ep1`,
        ...channelInfo
      }, { quoted: message });
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

      if (!searchRes.data?.status || !Array.isArray(searchRes.data?.result)) {
        throw new Error('Invalid search API response');
      }

      const results = searchRes.data.result;
      if (results.length === 0) {
        return await sock.sendMessage(chatId, {
          text: '❌ No results found. Try a different search term.',
          ...channelInfo
        }, { quoted: message });
      }

      // Take the first result
      const selected = results[0];
      const videoUrl = selected.link;
      const title = selected.title;
      const channel = selected.channel;
      const duration = selected.duration;
      const thumbnail = selected.imageUrl;

      // Send thumbnail with info (optional, but nice)
      await sock.sendMessage(chatId, {
        image: { url: thumbnail },
        caption: `🎬 *${title}*\n📺 ${channel}\n⏱️ ${duration}\n\n⏳ Fetching video download...`,
        ...channelInfo
      }, { quoted: message });

      // Step 2: Get download link
      const downloadApiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(videoUrl)}`;
      const dlRes = await axios.get(downloadApiUrl, { timeout: 60000 });

      if (!dlRes.data?.status || !dlRes.data?.result) {
        throw new Error('Invalid download API response');
      }

      const downloadUrl = dlRes.data.result.mp4; // default to mp4
      if (!downloadUrl) {
        throw new Error('No mp4 download available');
      }

      // Step 3: Send video
      const caption = `🎬 *${title}*\n📺 ${channel}\n⏱️ ${duration}\n\n📥 Downloaded via ${settings.botName}`;
      
      const messageOptions = {
        video: { url: downloadUrl },
        mimetype: 'video/mp4',
        caption: caption,
        contextInfo: {
          externalAdReply: {
            title: title.slice(0, 30),
            body: channel,
            thumbnailUrl: thumbnail,
            mediaType: 2,
            mediaUrl: downloadUrl,
            sourceUrl: videoUrl
          }
        },
        ...channelInfo
      };

      await sock.sendMessage(chatId, messageOptions, { quoted: message });

    } catch (error) {
      console.error('❌ Drama command error:', error);
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
