const axios = require('axios');

module.exports = {
  pattern: 'play',
  desc: 'Search and play a song using YouTube',
  category: 'music',
  filename: __filename,
  use: '<song name or YouTube URL>',
  
  async handler(message, query) {
    const input = query || message.quoted?.text;
    if (!input) {
      return await message.reply('🎵 *Please provide a song name or YouTube link!*');
    }

    await message.react('⏳');

    try {
      const isUrl = input.startsWith('http') && (input.includes('youtube.com') || input.includes('youtu.be'));

      let videoUrl, videoTitle, videoThumbnail;

      if (isUrl) {
        videoUrl = input;
        const searchUrl = `https://api.nexoracle.com/downloader/yt-search?apikey=free_key@maher_apis&q=${encodeURIComponent(input)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });
        if (searchRes.data?.result?.length) {
          const video = searchRes.data.result[0];
          videoTitle = video.title;
          videoThumbnail = video.thumbnail;
        } else {
          videoTitle = 'Unknown Title';
          videoThumbnail = null;
        }
      } else {
        const searchUrl = `https://api.nexoracle.com/downloader/yt-search?apikey=free_key@maher_apis&q=${encodeURIComponent(input)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });
        if (!searchRes.data?.result?.length) {
          await message.react('❌');
          return await message.reply('❌ No results found. Try a different search term.');
        }
        const video = searchRes.data.result[0];
        videoTitle = video.title;
        videoUrl = video.url;
        videoThumbnail = video.thumbnail;
      }

      if (videoThumbnail) {
        await message.bot.sendMessage(message.jid, {
          image: { url: videoThumbnail },
          caption: `🎶 *${videoTitle}*`
        }, { quoted: message });
      } else {
        await message.reply(`⏳ Downloading *${videoTitle}*...`);
      }

      const downloadUrl = `https://api.giftedtech.my.id/api/download/ytaudio?apikey=gifted&url=${encodeURIComponent(videoUrl)}`;
      const downloadRes = await axios.get(downloadUrl, { timeout: 30000 });

      if (downloadRes.data.status !== 200 || !downloadRes.data.result?.download_url) {
        throw new Error('Download failed');
      }

      const audioUrl = downloadRes.data.result.download_url;

      await message.bot.sendMessage(message.jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${videoTitle.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
      }, { quoted: message });

      await message.react('✅');

    } catch (error) {
      console.error('Play command error:', error);
      await message.react('❌');
      await message.reply('❌ Failed to download. Please try again later or use a different song.');
    }
  }
};
