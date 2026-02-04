const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('繼續播放音樂'),
  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);

    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '沒有歌在播，你讓我繼續什麼？', ephemeral: true });
    }

    if (!queue.paused) {
      return interaction.reply({ content: '音樂本來就在播，別浪費我時間。', ephemeral: true });
    }

    queue.resume();
    await interaction.reply('哼，看你誠心誠意的份上，音樂繼續了。');
  },
};
