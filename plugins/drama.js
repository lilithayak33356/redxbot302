// plugins/drama.js
const axios = require('axios');
const settings = require('../settings');

// Temporary storage for ongoing drama selections per chat
const dramaSessions = new Map();

module.exports = {
  command: 'drama',
  aliases: ['dramadl', 'watchdrama'],
  category: 'download',
  description: 'Search, select, and download dramas/videos interactively',
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

    // Step 1: Search
    await sock.sendPresenceUpdate('composing', chatId);
    await sock.sendMessage(chatId, {
      text: `🔍 Searching for "${query}"...`,
      ...channelInfo
    }, { quoted: message });

    try {
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

      // Store up to 5 results for this chat
      const topResults = results.slice(0, 5);
      dramaSessions.set(chatId, { results: topResults, step: 'select' });

      // Send results with thumbnails and numbers
      for (let i = 0; i < topResults.length; i++) {
        const item = topResults[i];
        const caption = `*${i + 1}.* ${item.title}\n📺 ${item.channel}\n⏱️ ${item.duration}`;
        await sock.sendMessage(chatId, {
          image: { url: item.imageUrl },
          caption: caption,
          ...channelInfo
        }, { quoted: message });
      }

      await sock.sendMessage(chatId, {
        text: `📝 *Reply with the number* (1-${topResults.length}) of the drama you want.`,
        ...channelInfo
      }, { quoted: message });

    } catch (error) {
      console.error('❌ Drama search error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Search failed. Please try again later.',
        ...channelInfo
      }, { quoted: message });
    }
  }
};

// Handler for user replies (must be called from messageHandler.js)
async function handleDramaReply(sock, message, context) {
  const { chatId, senderId, text } = context;
  const session = dramaSessions.get(chatId);
  if (!session) return false; // Not in a drama session

  if (session.step === 'select') {
    // User should send a number
    const num = parseInt(text);
    if (isNaN(num) || num < 1 || num > session.results.length) {
      await sock.sendMessage(chatId, {
        text: `❌ Invalid number. Please reply with a number between 1 and ${session.results.length}.`,
        ...context.channelInfo
      }, { quoted: message });
      return true;
    }

    // Store selected index and move to format selection
    session.selectedIndex = num - 1;
    session.step = 'format';
    dramaSessions.set(chatId, session);

    await sock.sendMessage(chatId, {
      text: `🎬 Selected: *${session.results[session.selectedIndex].title}*\n\nNow reply with the format:\n*mp3* (audio) or *mp4* (video)`,
      ...context.channelInfo
    }, { quoted: message });
    return true;
  }

  if (session.step === 'format') {
    const format = text.toLowerCase();
    if (format !== 'mp3' && format !== 'mp4') {
      await sock.sendMessage(chatId, {
        text: '❌ Invalid format. Please reply with *mp3* or *mp4*.',
        ...context.channelInfo
      }, { quoted: message });
      return true;
    }

    // All set – proceed to download
    const selected = session.results[session.selectedIndex];
    const videoUrl = selected.link;
    const title = selected.title;
    const channel = selected.channel;
    const duration = selected.duration;
    const thumbnail = selected.imageUrl;

    await sock.sendMessage(chatId, {
      text: `⏳ Fetching ${format.toUpperCase()} download for *${title}*...`,
      ...context.channelInfo
    }, { quoted: message });

    try {
      const downloadApiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(videoUrl)}`;
      const dlRes = await axios.get(downloadApiUrl, { timeout: 60000 });

      if (!dlRes.data?.status || !dlRes.data?.result) {
        throw new Error('Invalid download API response');
      }

      const downloadUrl = dlRes.data.result[format];
      if (!downloadUrl) {
        throw new Error(`No ${format} download available`);
      }

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

      await sock.sendMessage(chatId, { ...messageOptions, ...context.channelInfo }, { quoted: message });

      // Clear session
      dramaSessions.delete(chatId);

    } catch (error) {
      console.error('❌ Download error:', error);
      await sock.sendMessage(chatId, {
        text: '❌ Download failed. Please try again later.',
        ...context.channelInfo
      }, { quoted: message });
      dramaSessions.delete(chatId);
    }
    return true;
  }

  return false;
}

// Export the reply handler so it can be used in messageHandler.js
module.exports.handleDramaReply = handleDramaReply;
