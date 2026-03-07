const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
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
        const reply = { content: '執行指令時發生錯誤。', flags: MessageFlags.Ephemeral };
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = getConfig();
  if (!config) {
    return interaction.editReply({ content: '系統尚未初始化，請管理員執行 /setup-ow。' });
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
    return interaction.reply({ content: '系統尚未初始化，請管理員執行 /setup-ow。', flags: MessageFlags.Ephemeral });
  }

  const keyMap = {
    ow_role_tank:    'tank',
    ow_role_support: 'support',
    ow_role_dps:     'dps',
    ow_role_flex:    'flex',
  };

  const roleKey = keyMap[interaction.customId];
  const roleId = config.roles[roleKey];
  if (!roleId) return interaction.reply({ content: '找不到對應的身分組。', flags: MessageFlags.Ephemeral });

  const member = interaction.member;
  const hasRole = member.roles.cache.has(roleId);

  if (hasRole) {
    await member.roles.remove(roleId);
    await interaction.reply({ content: `已移除身分組。`, flags: MessageFlags.Ephemeral });
  } else {
    await member.roles.add(roleId);

    const tempRoleId = process.env.TEMP_ROLE_ID;
    if (tempRoleId && member.roles.cache.has(tempRoleId)) {
      await member.roles.remove(tempRoleId).catch(() => {});
    }

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

    await interaction.reply({ content: `✅ 已獲得身分組！現在可以進入其他頻道了。`, flags: MessageFlags.Ephemeral });
  }
}

async function handleLimitButton(interaction) {
  // customId: ow_limit_{n}_{channelId}
  const parts = interaction.customId.split('_');
  const limit = parseInt(parts[2]);
  const channelId = parts[3];

  const room = lfgRooms.get(channelId);
  if (!room) {
    return interaction.reply({ content: '這個房間已不存在。', flags: MessageFlags.Ephemeral });
  }
  if (room.ownerId !== interaction.user.id) {
    return interaction.reply({ content: '只有房主可以調整人數上限。', flags: MessageFlags.Ephemeral });
  }

  const voiceChannel = interaction.guild.channels.cache.get(channelId);
  if (!voiceChannel) {
    return interaction.reply({ content: '找不到語音頻道。', flags: MessageFlags.Ephemeral });
  }

  const currentCount = voiceChannel.members.size;
  const limitDisplay = limit === 0 ? '∞' : limit;
  await voiceChannel.setUserLimit(limit);
  await voiceChannel.setName(`⚔️ ${room.ownerName}的房間 (${currentCount}/${limitDisplay})`);

  room.limit = limit;
  lfgRooms.set(channelId, room);

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${room.ownerName} 的組隊房間`)
    .setDescription('點擊按鈕調整人數上限')
    .setColor(0xfa7454)
    .addFields({ name: '目前人數', value: `${currentCount}/${limitDisplay}`, inline: true });

  const row = new ActionRowBuilder().addComponents(
    [2, 3, 4, 5, 0].map((n) =>
      new ButtonBuilder()
        .setCustomId(`ow_limit_${n}_${channelId}`)
        .setLabel(n === 0 ? '不限制' : `${n}人`)
        .setStyle(n === limit ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );

  await interaction.update({ embeds: [embed], components: [row] });
}
