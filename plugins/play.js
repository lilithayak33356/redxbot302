const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const settings = require('../settings');

// Use ffmpeg-static if available
let ffmpegPath = 'ffmpeg';
try {
  ffmpegPath = require('ffmpeg-static') || 'ffmpeg';
} catch (e) {
  // fallback to system ffmpeg
}

module.exports = {
  command: 'play',
  aliases: ['song', 'mp3', 'ytmp3'],
  category: 'download',
  description: 'Download audio from YouTube by name or link',
  usage: '.play <song name or YouTube URL>',

  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;
    const query = args.join(' ').trim();

    if (!query) {
      return await sock.sendMessage(chatId, {
        text: '🎵 *Song Downloader*\n\nUsage:\n.play <song name | YouTube link>',
        ...channelInfo
      }, { quoted: message });
    }

    await sock.sendPresenceUpdate('composing', chatId);

    try {
      // Determine if query is a direct YouTube link
      let videoId = null;
      if (ytdl.validateURL(query)) {
        videoId = ytdl.getVideoID(query);
      }

      let videoInfo;
      if (videoId) {
        // Fetch by ID
        videoInfo = await ytdl.getInfo(videoId);
      } else {
        // Search by keyword
        const searchResult = await ytSearch(query);
        if (!searchResult.videos || searchResult.videos.length === 0) {
          return await sock.sendMessage(chatId, {
            text: '❌ No results found. Try a different search term.',
            ...channelInfo
          }, { quoted: message });
        }
        videoInfo = await ytdl.getInfo(searchResult.videos[0].url);
      }

      const { videoDetails } = videoInfo;
      const title = videoDetails.title;
      const duration = parseInt(videoDetails.lengthSeconds);
      const thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url;

      // Optional duration limit (e.g., 10 minutes)
      if (duration > 600) {
        return await sock.sendMessage(chatId, {
          text: `❌ Video too long (${Math.floor(duration / 60)} min). Max allowed: 10 min.`,
          ...channelInfo
        }, { quoted: message });
      }

      // Send info with thumbnail
      await sock.sendMessage(chatId, {
        image: { url: thumbnail },
        caption: `🎶 *${title}*\n⏱️ Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
        ...channelInfo
      }, { quoted: message });

      await sock.sendMessage(chatId, {
        text: '⏳ Downloading audio... Please wait.',
        ...channelInfo
      }, { quoted: message });

      // Create temp directory if not exists
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const outputPath = path.join(tempDir, `${Date.now()}.mp3`);

      // Download audio stream and convert with ffmpeg
      const audioStream = ytdl(videoDetails.video_url, {
        quality: 'lowestaudio',
        filter: 'audioonly'
      });

      const ffmpegProcess = exec(`"${ffmpegPath}" -i pipe:0 -vn -ab 128k -f mp3 -y "${outputPath}"`, {
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      audioStream.pipe(ffmpegProcess.stdin);
      ffmpegProcess.stderr.on('data', (data) => {
        // optional: log ffmpeg progress
        // console.log('ffmpeg:', data.toString());
      });

      await new Promise((resolve, reject) => {
        ffmpegProcess.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`FFmpeg exited with code ${code}`));
        });
        ffmpegProcess.on('error', reject);
      });

      // Read the converted file
      const audioBuffer = fs.readFileSync(outputPath);

      // Send as audio
      await sock.sendMessage(chatId, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`,
        ptt: false,
        contextInfo: {
          externalAdReply: {
            title: title.slice(0, 30),
            body: `Downloaded by ${settings.botName}`,
            thumbnailUrl: thumbnail,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: message });

      // Cleanup temp file
      fs.unlinkSync(outputPath);

    } catch (error) {
      console.error('Play command error:', error);
      let errorMsg = '❌ Failed to download. ';
      if (error.message.includes('ffmpeg')) errorMsg += 'Audio conversion failed.';
      else if (error.message.includes('video unavailable')) errorMsg += 'Video unavailable.';
      else errorMsg += 'Please try again later.';

      await sock.sendMessage(chatId, {
        text: errorMsg,
        ...channelInfo
      }, { quoted: message });
    }
  }
};
