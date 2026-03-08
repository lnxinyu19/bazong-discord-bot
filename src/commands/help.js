const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('查看所有可用指令'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('📜 指令清單')
      .setDescription('哼，記好了，別讓我說第二次。')
      .addFields(
        {
          name: '🎵 音樂指令',
          value: [
            '`/play <query>` — 播放音樂',
            '`/pause` — 暫停播放',
            '`/resume` — 繼續播放',
            '`/skip` — 跳過這首歌',
            '`/stop` — 停止播放並清空佇列',
            '`/queue` — 查看播放佇列',
          ].join('\n'),
        },
        {
          name: '🌤️ 生活指令',
          value: [
            '`/weather` — 查詢天氣預報',
          ].join('\n'),
        },
        {
          name: '⚔️ 組隊系統',
          value: [
            '加入「➕ 找人組隊」語音頻道，自動開一個房間',
            '房主可在組隊大廳的控制面板調整人數上限（2人～不限制）',
            '所有人離開後房間自動刪除',
          ].join('\n'),
        },
        {
          name: '🛠️ 管理指令',
          value: [
            '`/clear <amount> [channel]` — 清除訊息（需要權限）',
          ].join('\n'),
        },
      )
      .setFooter({ text: '還有什麼不懂的？' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
