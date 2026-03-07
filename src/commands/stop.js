const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('停止播放並清空佇列'),
  async execute(interaction) {
    const player = interaction.client.kazagumo.players.get(interaction.guildId);

    if (!player) {
      return interaction.reply({ content: '都沒在播了還想停？懷疑你的智商。', flags: MessageFlags.Ephemeral });
    }

    player.destroy();
    await interaction.reply('音樂全部停止，佇列清空。散會！');
  },
};
