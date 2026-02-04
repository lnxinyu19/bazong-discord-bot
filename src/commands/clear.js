const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('清除頻道中的訊息')
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('要刪除的訊息數量 (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('要清除的頻道（不指定則清除當前頻道）')
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    // 檢查是否為管理員
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '哼，這個指令只有管理員能用。你算哪根蔥？',
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await targetChannel.bulkDelete(amount, true);
      await interaction.editReply(
        `哼，已經清理了 <#${targetChannel.id}> 中的 **${deleted.size}** 則訊息。乾淨多了。`,
      );
    } catch (error) {
      console.error('清除訊息錯誤:', error);
      await interaction.editReply(
        `嘖，出了點問題：${error.message}。超過 14 天的訊息也無能為力。`,
      );
    }
  },
};
