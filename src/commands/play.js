const { SlashCommandBuilder } = require('discord.js');

// 清理 YouTube URL，移除播放清單參數
function cleanYouTubeUrl(input) {
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      url.searchParams.delete('list');
      url.searchParams.delete('index');
      url.searchParams.delete('start_radio');
      return url.toString();
    }
  } catch {
    // 不是有效 URL，可能是搜尋關鍵字
  }
  return input;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('播放 YouTube 音樂')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('YouTube 網址或搜尋關鍵字')
        .setRequired(true),
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '哼，連語音頻道都不進就想聽歌？沒空伺候。',
        ephemeral: true,
      });
    }

    const rawQuery = interaction.options.getString('query');
    const query = cleanYouTubeUrl(rawQuery);
    await interaction.deferReply();

    try {
      const kazagumo = interaction.client.kazagumo;

      // 透過 Lavalink 搜尋曲目
      const result = await kazagumo.search(query, {
        requester: interaction.member,
      });

      if (!result.tracks.length) {
        return interaction.editReply('找不到任何結果，換個關鍵字試試。');
      }

      // 取得或建立此伺服器的 player
      let player = kazagumo.players.get(interaction.guildId);
      if (!player) {
        player = await kazagumo.createPlayer({
          guildId: interaction.guildId,
          textId: interaction.channelId,
          voiceId: voiceChannel.id,
          volume: 80,
        });
      }

      // 加入曲目到佇列
      if (result.type === 'PLAYLIST') {
        player.queue.add(result.tracks);
        await interaction.editReply(
          `已加入播放清單：**${result.playlistName}**（${result.tracks.length} 首），感恩戴德吧。`,
        );
      } else {
        const track = result.tracks[0];
        player.queue.add(track);
        await interaction.editReply(`正在搜尋：**${query}**，感恩戴德吧。`);
      }

      // 如果沒有在播放，開始播放
      if (!player.playing && !player.paused) {
        player.play();
      }
    } catch (error) {
      console.error('Play 錯誤:', error);
      await interaction.editReply(
        `嘖，出了點狀況：${error.message}。會處理的，別慌。`,
      );
    }
  },
};
