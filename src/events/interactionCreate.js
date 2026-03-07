const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const lfgRooms = require('../state/lfgRooms');
const welcomeMessages = require('../config/welcomeMessages');

const CONFIG_PATH = path.join(__dirname, '../config/ow-setup.json');

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`指令 ${interaction.commandName} 執行錯誤:`, error);
        const reply = { content: '執行指令時發生錯誤。', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === 'ow_read') {
        await handleReadButton(interaction);
        return;
      }

      if (customId.startsWith('ow_role_')) {
        await handleRoleButton(interaction);
        return;
      }

      if (customId.startsWith('ow_limit_')) {
        await handleLimitButton(interaction);
        return;
      }
    }
  },
};

async function handleReadButton(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const config = getConfig();
  if (!config) {
    return interaction.editReply({ content: '系統尚未初始化，請管理員執行 /setup-ow。' });
  }

  const member = interaction.member;
  const readRoleId = config.roles.read;
  if (!readRoleId) {
    return interaction.editReply({ content: '找不到「已閱讀」身分組，請管理員重新執行 /setup-ow。' });
  }

  if (!member.roles.cache.has(readRoleId)) {
    await member.roles.add(readRoleId);
  }

  const roleEmbed = new EmbedBuilder()
    .setTitle('選擇你的 OW 角色')
    .setDescription('點擊按鈕選擇你的主要角色，再次點擊可取消，可以複選。\n選完後即可進入其他頻道。')
    .setColor(0x5865F2);

  const roleRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ow_role_tank').setLabel('🛡️ 坦克').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ow_role_support').setLabel('💚 輔助').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ow_role_dps').setLabel('⚔️ 輸出').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ow_role_flex').setLabel('🔄 補位').setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ embeds: [roleEmbed], components: [roleRow] });
}

async function handleRoleButton(interaction) {
  const config = getConfig();
  if (!config) {
    return interaction.reply({ content: '系統尚未初始化，請管理員執行 /setup-ow。', ephemeral: true });
  }

  const keyMap = {
    ow_role_tank:    'tank',
    ow_role_support: 'support',
    ow_role_dps:     'dps',
    ow_role_flex:    'flex',
  };

  const roleKey = keyMap[interaction.customId];
  const roleId = config.roles[roleKey];
  if (!roleId) return interaction.reply({ content: '找不到對應的身分組。', ephemeral: true });

  const member = interaction.member;

  // 必須先點「已閱讀」
  const readRoleId = config.roles.read;
  if (readRoleId && !member.roles.cache.has(readRoleId)) {
    return interaction.reply({ content: '請先點擊上方的「✅ 我已閱讀」按鈕，再來選身分組！', ephemeral: true });
  }

  const hasRole = member.roles.cache.has(roleId);

  if (hasRole) {
    await member.roles.remove(roleId);
    await interaction.reply({ content: `已移除身分組。`, ephemeral: true });
  } else {
    await member.roles.add(roleId);

    // 第一次選角色時移除「待驗證」並發送歡迎訊息
    const unverifiedId = config.roles.unverified;
    const isFirstTime = unverifiedId && member.roles.cache.has(unverifiedId);
    if (isFirstTime) {
      await member.roles.remove(unverifiedId);

      const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
      if (welcomeChannelId) {
        const welcomeChannel = interaction.client.channels.cache.get(welcomeChannelId);
        if (welcomeChannel) {
          const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
          await welcomeChannel.send(randomMsg.replace('{user}', `<@${member.id}>`));
        }
      }
    }

    await interaction.reply({ content: `✅ 已獲得身分組！現在可以進入其他頻道了。`, ephemeral: true });
  }
}

async function handleLimitButton(interaction) {
  // customId: ow_limit_{n}_{channelId}
  const parts = interaction.customId.split('_');
  const limit = parseInt(parts[2]);
  const channelId = parts[3];

  const room = lfgRooms.get(channelId);
  if (!room) {
    return interaction.reply({ content: '這個房間已不存在。', ephemeral: true });
  }
  if (room.ownerId !== interaction.user.id) {
    return interaction.reply({ content: '只有房主可以調整人數上限。', ephemeral: true });
  }

  const voiceChannel = interaction.guild.channels.cache.get(channelId);
  if (!voiceChannel) {
    return interaction.reply({ content: '找不到語音頻道。', ephemeral: true });
  }

  const currentCount = voiceChannel.members.size;
  await voiceChannel.setUserLimit(limit);
  await voiceChannel.setName(`⚔️ ${room.ownerName}的房間 (${currentCount}/${limit})`);

  room.limit = limit;
  lfgRooms.set(channelId, room);

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${room.ownerName} 的組隊房間`)
    .setDescription('點擊按鈕調整人數上限')
    .setColor(0xfa7454)
    .addFields({ name: '目前人數', value: `${currentCount}/${limit}`, inline: true });

  const row = new ActionRowBuilder().addComponents(
    [2, 3, 4, 5].map((n) =>
      new ButtonBuilder()
        .setCustomId(`ow_limit_${n}_${channelId}`)
        .setLabel(`${n}人`)
        .setStyle(n === limit ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );

  await interaction.update({ embeds: [embed], components: [row] });
}
