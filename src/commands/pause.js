const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('暫停目前的音樂'),
  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);

    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '現在根本沒在播歌，你是在指揮誰？', ephemeral: true });
    }

    if (queue.paused) {
      return interaction.reply({ content: '已經暫停了，不喜歡重複的命令。', ephemeral: true });
    }

    queue.pause();
    await interaction.reply('音樂暫停了，想繼續的話——求我。');
  },
};
