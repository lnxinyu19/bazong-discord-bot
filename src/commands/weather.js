const { SlashCommandBuilder } = require('discord.js');
const { getWeatherMessage } = require('../services/weatherService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('查詢今日天氣預報'),
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const message = await getWeatherMessage();
      await interaction.editReply(message);
    } catch (error) {
      console.error('天氣查詢錯誤:', error);
      await interaction.editReply(`嘖，天氣資料出了點問題：${error.message}。會派人去查的。`);
    }
  },
};
