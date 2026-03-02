const axios = require('axios');

module.exports = {
  command: 'play2',
  aliases: ['music2', 'song2'],
  category: 'music',
  description: 'Download a song as MP3 (NeoXR API)',
  usage: '.play2 <song name>',
  
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const query = args.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: "❌ *Missing song name*\nExample: .play2 Believer",
        ...channelInfo
      }, { quoted: message });
    }

    await sock.sendMessage(chatId, {
      text: "🔍 *Searching via NeoXR...*",
      ...channelInfo
    }, { quoted: message });

    try {
      // Search using NeoXR API
      const searchUrl = `https://api.neoxr.my.id/api/spotify?q=${encodeURIComponent(query)}&apikey=yourkey`; // Replace with actual key if needed
      const searchRes = await axios.get(searchUrl, { timeout: 15000 });

      if (!searchRes.data?.data?.length) {
        throw new Error('No results');
      }

      const track = searchRes.data.data[0];
      const title = track.title;
      const artist = track.artist;
      const duration = track.duration;
      const thumbnail = track.thumbnail;
      const spotifyUrl = track.url;

      await sock.sendMessage(chatId, {
        text: `✅ *Found:* ${title} - ${artist}\n⏱️ *Duration:* ${duration}\n⏳ *Downloading...*`,
        ...channelInfo
      }, { quoted: message });

      // Download using NeoXR download endpoint (if available)
      // Some APIs provide direct download in search, otherwise use separate download endpoint
      const audioUrl = track.download || track.audio; // adjust based on actual response

      if (!audioUrl) {
        throw new Error('No download link');
      }

      // Get thumbnail
      let thumbBuffer = null;
      if (thumbnail) {
        try {
          const imgRes = await axios.get(thumbnail, { responseType: 'arraybuffer', timeout: 10000 });
          thumbBuffer = Buffer.from(imgRes.data);
        } catch (e) {}
      }

      // Send audio
      await sock.sendMessage(chatId, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title} - ${artist}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: title,
            body: artist,
            thumbnail: thumbBuffer,
            mediaType: 2,
            mediaUrl: spotifyUrl,
            sourceUrl: spotifyUrl
          }
        }
      }, { quoted: message });

    } catch (error) {
      console.error('Play2 (NeoXR) error:', error.message);
      await sock.sendMessage(chatId, {
        text: "❌ *Download failed*\nPlease try .play or .play3 for alternative sources.",
        ...channelInfo
      }, { quoted: message });
    }
  }
};
