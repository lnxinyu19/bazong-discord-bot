const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('停止播放並清空佇列'),
  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);

    if (!queue) {
      return interaction.reply({ content: '都沒在播了還想停？懷疑你的智商。', ephemeral: true });
    }

    await queue.stop();
    await interaction.reply('音樂全部停止，佇列清空。散會！');
  },
};
