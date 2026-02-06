require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Kazagumo } = require('kazagumo');
const { Connectors } = require('shoukaku');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Lavalink 節點設定
const Nodes = [
  {
    name: 'main',
    url: process.env.LAVALINK_HOST || 'localhost:2333',
    auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    secure: false,
  },
];

// 初始化 Kazagumo（Lavalink 客戶端，內建 queue）
const kazagumo = new Kazagumo(
  {
    defaultSearchEngine: 'youtube',
    send: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
  },
  new Connectors.DiscordJS(client),
  Nodes,
);

client.kazagumo = kazagumo;

// 工具函式：毫秒轉 mm:ss
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 取得音樂頻道
async function getMusicChannel() {
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

// 將 formatDuration 掛到 client 上供指令使用
client.formatDuration = formatDuration;

// Kazagumo 事件（取代 DisTube 事件）
kazagumo.on('playerStart', async (player, track) => {
  const channel = await getMusicChannel();
  if (channel) {
    channel.send(
      `正在播放：**${track.title}** - \`${formatDuration(track.length)}\`，都給我安靜聽。`,
    );
  }
});

kazagumo.on('playerEmpty', async (player) => {
  const channel = await getMusicChannel();
  if (channel) {
    channel.send('歌都放完了，演唱會到此結束。要安可的話自己點歌。');
  }
  player.destroy();
});

// Shoukaku（底層 Lavalink 連線）事件
kazagumo.shoukaku.on('ready', (name) =>
  console.log(`Lavalink 節點 "${name}": 已連線！`),
);
kazagumo.shoukaku.on('error', (name, error) =>
  console.error(`Lavalink 節點 "${name}": 錯誤`, error),
);
kazagumo.shoukaku.on('close', (name, code, reason) =>
  console.warn(
    `Lavalink 節點 "${name}": 已斷線，代碼 ${code}，原因 ${reason || '無'}`,
  ),
);
kazagumo.shoukaku.on('disconnect', (name, players, moved) =>
  console.warn(`Lavalink 節點 "${name}": 已斷開連線，moved: ${moved}`),
);

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

client.login(process.env.DISCORD_TOKEN);
