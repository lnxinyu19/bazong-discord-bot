const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('暫停目前的音樂'),
  async execute(interaction) {
    const player = interaction.client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
      return interaction.reply({ content: '現在根本沒在播歌，你是在指揮誰？', ephemeral: true });
    }

    if (player.paused) {
      return interaction.reply({ content: '已經暫停了，不喜歡重複的命令。', ephemeral: true });
    }

    player.pause(true);
    await interaction.reply('音樂暫停了，想繼續的話——求我。');
  },
};
