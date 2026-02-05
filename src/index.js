require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const ffmpegPath = require('ffmpeg-static');
const { generateDependencyReport } = require('@discordjs/voice');

// 輸出語音依賴報告
console.log('=== Discord.js Voice 依賴報告 ===');
console.log(generateDependencyReport());
console.log('================================');

const fs = require('fs');
const path = require('path');

// 從環境變數生成 cookies 檔案（用於 Zeabur 等 PaaS 平台）
// ytdl-core 需要 JSON 格式的 cookies
const cookiesJsonPath = path.join(__dirname, '..', 'cookies.json');
const cookiesTxtPath = path.join(__dirname, '..', 'cookies.txt');
console.log('Cookies JSON 檔案路徑:', cookiesJsonPath);

let parsedCookies = null;

// 優先使用 JSON 格式的 cookies
if (process.env.YOUTUBE_COOKIES_JSON_BASE64) {
  // JSON 格式的 cookies（推薦）
  const cookiesJson = Buffer.from(process.env.YOUTUBE_COOKIES_JSON_BASE64, 'base64').toString('utf-8');
  fs.writeFileSync(cookiesJsonPath, cookiesJson);
  console.log('已從 JSON Base64 環境變數生成 cookies.json');

  try {
    parsedCookies = JSON.parse(cookiesJson);
    console.log('✓ cookies 解析成功，數量:', parsedCookies.length);
  } catch (e) {
    console.log('✗ cookies.json 解析失敗:', e.message);
  }
} else if (fs.existsSync(cookiesJsonPath)) {
  // 使用本地 cookies.json 檔案
  console.log('使用本地 cookies.json 檔案');
  try {
    parsedCookies = JSON.parse(fs.readFileSync(cookiesJsonPath, 'utf-8'));
    console.log('✓ cookies 解析成功，數量:', parsedCookies.length);
  } catch (e) {
    console.log('✗ cookies.json 解析失敗:', e.message);
  }
} else if (process.env.YOUTUBE_COOKIES_BASE64) {
  // 嘗試使用 Netscape 格式 cookies（向後相容）
  console.log('注意: 使用 Netscape 格式 cookies，自動轉換為 JSON 格式');
  let cookiesContent = Buffer.from(process.env.YOUTUBE_COOKIES_BASE64, 'base64').toString('utf-8');
  cookiesContent = cookiesContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fs.writeFileSync(cookiesTxtPath, cookiesContent);
  console.log('已從 Base64 環境變數生成 cookies.txt');

  // 將 Netscape 格式轉換為 JSON 格式
  try {
    parsedCookies = parseNetscapeCookies(cookiesContent);
    console.log('✓ 從 Netscape 格式轉換成功，cookies 數量:', parsedCookies.length);
  } catch (e) {
    console.log('✗ Netscape cookies 轉換失敗:', e.message);
  }
} else {
  console.log('警告: YOUTUBE_COOKIES 環境變數未設定，點歌功能可能無法使用');
}

// 將 Netscape 格式 cookies 轉換為 JSON 格式
function parseNetscapeCookies(content) {
  const cookies = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length >= 7) {
      cookies.push({
        domain: parts[0],
        hostOnly: parts[1] !== 'TRUE',
        path: parts[2],
        secure: parts[3] === 'TRUE',
        expirationDate: parseInt(parts[4]) || undefined,
        name: parts[5],
        value: parts[6],
      });
    }
  }
  return cookies;
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

// 驗證 cookies 狀態
console.log('DisTube 初始化時 cookies 狀態:', parsedCookies ? `已解析 ${parsedCookies.length} 個` : '未設定');

// 初始化 DisTube（使用 @distube/yt-dlp 插件）
const distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [
    new YtDlpPlugin({
      update: true,
      cookies: cookiesTxtPath,
    }),
  ],
  ffmpeg: { path: ffmpegPath },
});
client.distube = distube;
console.log('✓ 使用 YtDlpPlugin (cookies 路徑:', cookiesTxtPath, ')');

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

// distube.on('error', (channel, error) => {
//   console.error('DisTube 錯誤：', error);
// });

// distube.on('ffmpegDebug', (debug) => {
//   console.log('FFmpeg Debug:', debug);
// });

// distube.on('debug', (debug) => {
//   console.log('DisTube Debug:', debug);
// });

client.login(process.env.DISCORD_TOKEN);
