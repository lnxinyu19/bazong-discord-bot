const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { runOwSetup, OW_ROLES } = require('../services/owSetup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ow')
    .setDescription('初始化 OW 找人系統（建立身分組和頻道）')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let result;
    try {
      result = await runOwSetup(interaction.guild);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }

    const { hubChannel, textChannel, roleSelectionChannel } = result;

    await interaction.editReply(
      `✅ 設定完成！\n\n` +
      `**身分組**\n待驗證 / ${OW_ROLES.map((r) => r.name).join(' / ')}\n\n` +
      `${process.env.TEMP_ROLE_ID ? '⚠️ TEMP_ROLE_ID 已設定，舊成員領取身分組後會自動移除臨時身分組。\n\n' : ''}` +
      `**頻道**\n` +
      `選角色：<#${roleSelectionChannel.id}>\n` +
      `Hub：<#${hubChannel.id}>\n` +
      `組隊大廳：<#${textChannel.id}>\n\n` +
      `⚠️ 記得手動將伺服器其他頻道設為「待驗證」身分組**看不到**，這樣新成員才只能看到選角色頻道。`,
    );
  },
};
