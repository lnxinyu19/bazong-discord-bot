const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('跳過目前的歌曲'),
  async execute(interaction) {
    const player = interaction.client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
      return interaction.reply({ content: '現在又沒在播歌，跳什麼跳？', ephemeral: true });
    }

    if (player.queue.length === 0) {
      player.destroy();
      return interaction.reply('後面沒歌了，直接停止播放。要聽就用 `/play` 自己點。');
    }

    player.skip();
    await interaction.reply('這首歌不配聽完，下一首！');
  },
};
