const { SlashCommandBuilder } = require("discord.js");

// 清理 YouTube URL，移除播放清單參數
function cleanYouTubeUrl(input) {
  try {
    const url = new URL(input);
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      url.searchParams.delete("list");
      url.searchParams.delete("index");
      url.searchParams.delete("start_radio");
      return url.toString();
    }
  } catch {
    // 不是有效 URL，可能是搜尋關鍵字
  }
  return input;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("播放 YouTube 音樂")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("YouTube 網址或搜尋關鍵字")
        .setRequired(true),
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: "哼，連語音頻道都不進就想聽歌？沒空伺候。",
        ephemeral: true,
      });
    }

    const rawQuery = interaction.options.getString("query");
    const query = cleanYouTubeUrl(rawQuery);
    await interaction.deferReply();

    try {
      const distube = interaction.client.distube;

      await distube.play(voiceChannel, query, {
        member: interaction.member,
        textChannel: interaction.channel,
      });

      await interaction.editReply(`正在搜尋：**${query}**，感恩戴德吧。`);
    } catch (error) {
      console.error("Play 錯誤:", error);
      await interaction.editReply(
        `嘖，出了點狀況：${error.message}。會處理的，別慌。`,
      );
    }
  },
};
