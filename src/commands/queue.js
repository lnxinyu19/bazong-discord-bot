const { SlashCommandBuilder } = require('discord.js');

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('顯示目前的播放佇列'),
  async execute(interaction) {
    const player = interaction.client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
      return interaction.reply({ content: '佇列是空的，耳朵正在休息。', ephemeral: true });
    }

    const current = player.queue.current;
    const upcoming = [...player.queue].slice(0, 10);

    let message = `**正在播放：** ${current.title} - \`${formatDuration(current.length)}\`\n`;

    if (upcoming.length > 0) {
      message += '\n**排隊中：**\n';
      message += upcoming
        .map((track, i) => `${i + 1}. ${track.title} - \`${formatDuration(track.length)}\``)
        .join('\n');
    }

    if (player.queue.length > 10) {
      message += `\n...還有 ${player.queue.length - 10} 首在候著`;
    }

    await interaction.reply(message);
  },
};
