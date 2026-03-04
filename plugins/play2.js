const axios = require('axios');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const settings = require('../settings');

module.exports = {
  command: 'play2',
  aliases: ['song2', 'ytmp32'],
  category: 'download',
  description: 'Alternative download method (multiple sources)',
  usage: '.play2 <song name>',

  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const query = args.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: '🎵 *Alternative Song Downloader*\n\nUsage:\n.play2 <song name>',
        ...channelInfo
      }, { quoted: message });
    }

    await sock.sendPresenceUpdate('composing', chatId);

    // Try multiple sources in order
    const sources = [
      async () => {
        // Source 1: qasimdev API
        const searchRes = await axios.get(`https://api.qasimdev.dpdns.org/api/loaderto/search?apiKey=qasim-dev&query=${encodeURIComponent(query)}`);
        if (searchRes.data?.length) {
          const first = searchRes.data[0];
          const downloadUrl = `https://api.qasimdev.dpdns.org/api/loaderto/download?apiKey=qasim-dev&format=mp3&url=${encodeURIComponent(first.url)}`;
          const dlRes = await axios.get(downloadUrl);
          return { title: first.title, thumbnail: first.thumbnail, audioUrl: dlRes.data.downloadUrl };
        }
        throw new Error('No results from API');
      },
      async () => {
        // Source 2: ytdl-core (direct download, but we'll just return info and let client download? Actually we can't return buffer here, so we'll use a different approach)
        // For simplicity, we'll just use ytdl to get a stream but we need to send audio; we'll reuse play.js logic but simplified
        const search = await ytSearch(query);
        if (!search.videos?.length) throw new Error('No results');
        const video = search.videos[0];
        const info = await ytdl.getInfo(video.url);
        const audioStream = ytdl(info.videoDetails.video_url, { quality: 'lowestaudio', filter: 'audioonly' });
        // We can't return a stream directly, so we'll download to buffer
        const chunks = [];
        for await (const chunk of audioStream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        return { title: video.title, thumbnail: video.thumbnail, buffer };
      }
    ];

    let lastError;
    for (const source of sources) {
      try {
        const result = await source();
        if (result.buffer) {
          // Send from buffer
          await sock.sendMessage(chatId, {
            image: { url: result.thumbnail },
            caption: `🎶 *${result.title}*`,
            ...channelInfo
          }, { quoted: message });

          await sock.sendMessage(chatId, {
            audio: result.buffer,
            mimetype: 'audio/mpeg',
            fileName: `${result.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`,
            ...channelInfo
          }, { quoted: message });
        } else {
          // Send from URL
          await sock.sendMessage(chatId, {
            image: { url: result.thumbnail },
            caption: `🎶 *${result.title}*`,
            ...channelInfo
          }, { quoted: message });

          await sock.sendMessage(chatId, {
            audio: { url: result.audioUrl },
            mimetype: 'audio/mpeg',
            fileName: 'song.mp3',
            ...channelInfo
          }, { quoted: message });
        }
        return;
      } catch (err) {
        lastError = err;
        console.log('Source failed:', err.message);
      }
    }

    // All sources failed
    await sock.sendMessage(chatId, {
      text: '❌ All download sources failed. Try .play instead.',
      ...channelInfo
    }, { quoted: message });
  }
};
