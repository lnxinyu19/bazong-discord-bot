require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const ffmpegPath = require('ffmpeg-static');

const fs = require('fs');
const path = require('path');

// 從環境變數生成 cookies 檔案（用於 Zeabur 等 PaaS 平台）
const cookiesPath = path.join(__dirname, '..', 'cookies.txt');
console.log('Cookies 檔案路徑:', cookiesPath);

if (process.env.YOUTUBE_COOKIES_BASE64) {
  // 使用 Base64 編碼的 cookies（推薦，可保留換行符）
  const cookiesContent = Buffer.from(process.env.YOUTUBE_COOKIES_BASE64, 'base64').toString('utf-8');
  fs.writeFileSync(cookiesPath, cookiesContent);
  console.log('已從 Base64 環境變數生成 cookies.txt');
  console.log('cookies.txt 檔案大小:', fs.statSync(cookiesPath).size, 'bytes');
  console.log('cookies.txt 前 200 字元:', cookiesContent.substring(0, 200));
} else if (process.env.YOUTUBE_COOKIES) {
  // 直接使用純文字 cookies
  fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES);
  console.log('已從環境變數生成 cookies.txt');
  console.log('cookies.txt 檔案大小:', fs.statSync(cookiesPath).size, 'bytes');
} else {
  console.log('警告: YOUTUBE_COOKIES 環境變數未設定，點歌功能可能無法使用');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 初始化 DisTube
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [
    new YtDlpPlugin({
      update: true,
      cookies: cookiesPath,
    }),
  ],
  ffmpeg: { path: ffmpegPath },
});
client.distube = distube;

// 載入指令
client.commands = new Collection();
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// 載入事件
const eventFiles = fs
  .readdirSync(path.join(__dirname, 'events'))
  .filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// 取得音樂頻道
async function getMusicChannel(guild) {
  const musicChannelId = process.env.MUSIC_CHANNEL_ID;
  if (musicChannelId) {
    try {
      return await client.channels.fetch(musicChannelId);
    } catch {
      return null;
    }
  }
  return null;
}

// DisTube 事件
distube.on('playSong', async (queue, song) => {
  const channel = await getMusicChannel(queue.voiceChannel.guild);
  if (channel) {
    channel.send(`正在播放：**${song.name}** - \`${song.formattedDuration}\`，都給我安靜聽。`);
  }
});

distube.on('addSong', async (queue, song) => {
  const channel = await getMusicChannel(queue.voiceChannel.guild);
  if (channel) {
    channel.send(`**${song.name}** - \`${song.formattedDuration}\` 已排入播放清單，耐心等著。`);
  }
});

distube.on('finish', async (queue) => {
  const channel = await getMusicChannel(queue.voiceChannel.guild);
  if (channel) {
    channel.send('歌都放完了，演唱會到此結束。要安可的話自己點歌。');
  }
});

distube.on('error', (channel, error) => {
  console.error('DisTube 錯誤：', error);
});

distube.on('ffmpegDebug', (debug) => {
  console.log('FFmpeg Debug:', debug);
});

distube.on('debug', (debug) => {
  console.log('DisTube Debug:', debug);
});

client.login(process.env.DISCORD_TOKEN);
