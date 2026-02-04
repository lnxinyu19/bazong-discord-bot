const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('顯示目前的播放佇列'),
  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);

    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '佇列是空的，耳朵正在休息。', ephemeral: true });
    }

    const currentSong = queue.songs[0];
    const upcomingSongs = queue.songs.slice(1, 11);

    let message = `**正在播放：** ${currentSong.name} - \`${currentSong.formattedDuration}\`\n`;

    if (upcomingSongs.length > 0) {
      message += '\n**排隊中：**\n';
      message += upcomingSongs
        .map((song, i) => `${i + 1}. ${song.name} - \`${song.formattedDuration}\``)
        .join('\n');
    }

    if (queue.songs.length > 11) {
      message += `\n...還有 ${queue.songs.length - 11} 首在候著`;
    }

    await interaction.reply(message);
  },
};
