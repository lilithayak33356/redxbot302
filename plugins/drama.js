// plugins/drama.js
const axios = require('axios');
const settings = require('../settings');

module.exports = {
  command: 'drama',
  aliases: ['dramadl', 'watchdrama'],
  category: 'download',
  description: 'Search and download dramas/videos (mp3 or mp4)',
  usage: '.drama <name> [result number] [mp3/mp4]',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    
    if (args.length === 0) {
      return await sock.sendMessage(chatId, {
        text: `🎬 *Drama Downloader*\n\nUsage:\n.drama <drama name> [result number] [mp3/mp4]\n\nExamples:\n.drama sher ep1\n.drama sher ep1 2\n.drama sher ep1 2 mp3`,
        ...channelInfo
      }, { quoted: message });
    }

    // Parse arguments: last could be format, second-last could be index
    let format = 'mp4'; // default
    let index = 1;
    let query = args.join(' ');

    const last = args[args.length - 1].toLowerCase();
    if (last === 'mp3' || last === 'mp4') {
      format = last;
      args.pop(); // remove format
    }

    const secondLast = args[args.length - 1];
    if (args.length > 1 && !isNaN(secondLast)) {
      index = parseInt(secondLast);
      args.pop(); // remove index
    }

    query = args.join(' '); // remaining is the search query

    await sock.sendPresenceUpdate('composing', chatId);
    await sock.sendMessage(chatId, {
      text: `🔍 Searching for "${query}"...`,
      ...channelInfo
    }, { quoted: message });

    try {
      // Step 1: Search
      const searchUrl = `https://jawad-tech.vercel.app/search/youtube?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      if (!searchRes.data?.status || !searchRes.data?.result) {
        throw new Error('Invalid search API response');
      }

      const results = searchRes.data.result;
      if (results.length === 0) {
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
      const videoUrl = selected.link;
      const title = selected.title;
      const channel = selected.channel;
      const duration = selected.duration;
      const thumbnail = selected.imageUrl;

      // Show selected item info
      await sock.sendMessage(chatId, {
        text: `✅ *Selected:*\n\n📌 *${title}*\n📺 ${channel}\n⏱️ ${duration}\n\n⏳ Fetching ${format.toUpperCase()} download...`,
        ...channelInfo
      }, { quoted: message });

      // Step 2: Get download link
      const downloadApiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(videoUrl)}`;
      const dlRes = await axios.get(downloadApiUrl, { timeout: 60000 });

      // Parse download response – it has result.mp3 and result.mp4
      if (!dlRes.data?.status || !dlRes.data?.result) {
        throw new Error('Invalid download API response');
      }

      const downloadUrl = dlRes.data.result[format]; // mp3 or mp4 field
      if (!downloadUrl) {
        throw new Error(`No ${format} download available`);
      }

      // Step 3: Send media (video for mp4, audio for mp3)
      const caption = `🎬 *${title}*\n📺 ${channel}\n⏱️ ${duration}\n\n📥 Downloaded via ${settings.botName}`;
      
      let messageOptions;
      if (format === 'mp4') {
        messageOptions = {
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
          }
        };
      } else {
        // mp3 – send as audio
        messageOptions = {
          audio: { url: downloadUrl },
          mimetype: 'audio/mpeg',
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
          }
        };
      }

      await sock.sendMessage(chatId, { ...messageOptions, ...channelInfo }, { quoted: message });

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
