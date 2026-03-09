const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const FALLBACK_ROLE_ID = '1479733427518308384'; // 待驗證
const ADMIN_USER_ID = '357462526465933313';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fix-roles')
    .setDescription('掃描所有成員，把沒有身分組的人補上「待驗證」身分組（僅限管理員）')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    if (interaction.user.id !== ADMIN_USER_ID) {
      return interaction.reply({ content: '你沒有權限使用這個指令。', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    // Fetch all members (may take a moment for large servers)
    const members = await guild.members.fetch();

    const fallbackRole = guild.roles.cache.get(FALLBACK_ROLE_ID);
    if (!fallbackRole) {
      return interaction.editReply({ content: '找不到待驗證身分組，請確認 ID 是否正確。' });
    }

    let count = 0;
    const failed = [];

    for (const [, member] of members) {
      if (member.user.bot) continue;
      // roles.cache always includes @everyone, so check if size <= 1
      const hasRoles = member.roles.cache.size > 1;
      if (!hasRoles) {
        try {
          await member.roles.add(FALLBACK_ROLE_ID);
          count++;
        } catch {
          failed.push(`<@${member.id}>`);
        }
      }
    }

    let reply = `✅ 完成！已補上待驗證身分組：${count} 人。`;
    if (failed.length > 0) {
      reply += `\n⚠️ 以下成員設定失敗：${failed.join('、')}`;
    }

    await interaction.editReply({ content: reply });
  },
};
