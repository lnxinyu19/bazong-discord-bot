require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`正在註冊 ${commands.length} 個斜線指令...`);

    // 使用全域註冊（所有伺服器都能使用，但需要等待約 1 小時才生效）
    // 如果你想要即時生效，可以改用 guild-specific 註冊（見下方註解）
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log(`成功註冊 ${data.length} 個斜線指令！`);
  } catch (error) {
    console.error('註冊指令時發生錯誤：', error);
  }
})();
