const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });
const { REST, Routes } = require('discord.js');

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
    const isDev = fs.existsSync('.env.local') && process.env.TEST_GUILD_ID;
    console.log(`正在${isDev ? '【開發】Guild' : '【正式】全域'}註冊 ${commands.length} 個斜線指令...`);

    const route = isDev
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);

    const data = await rest.put(route, { body: commands });

    console.log(`成功註冊 ${data.length} 個斜線指令！`);
  } catch (error) {
    console.error('註冊指令時發生錯誤：', error);
  }
})();
