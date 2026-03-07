const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('繼續播放音樂'),
  async execute(interaction) {
    const player = interaction.client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
      return interaction.reply({ content: '沒有歌在播，你讓我繼續什麼？', flags: MessageFlags.Ephemeral });
    }

    if (!player.paused) {
      return interaction.reply({ content: '音樂本來就在播，別浪費我時間。', flags: MessageFlags.Ephemeral });
    }

    player.pause(false);
    await interaction.reply('哼，看你誠心誠意的份上，音樂繼續了。');
  },
};
