const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const lfgRooms = require('../state/lfgRooms');
const welcomeMessages = require('../config/welcomeMessages');

const CONFIG_PATH = path.join(__dirname, '../config/ow-setup.json');

const ROLE_DEFS = [
  { customId: 'ow_role_tank',    label: '🛡️ 坦克', key: 'tank' },
  { customId: 'ow_role_support', label: '💚 輔助', key: 'support' },
  { customId: 'ow_role_dps',     label: '⚔️ 輸出', key: 'dps' },
  { customId: 'ow_role_flex',    label: '🔄 補位', key: 'flex' },
];

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function buildRoleRows(selectedKeys) {
  const roleRow = new ActionRowBuilder().addComponents(
    ROLE_DEFS.map(({ customId, label, key }) =>
      new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(selectedKeys.includes(key) ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );
  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ow_role_confirm')
      .setLabel('✅ 確認')
      .setStyle(ButtonStyle.Success),
  );
  return [roleRow, confirmRow];
}

// 忽略雙實例重疊時的 40060，其他錯誤照常 log
function safeHandle(label, fn) {
  return fn().catch((err) => {
    if (err.code !== 40060) console.error(`[${label}] 錯誤:`, err);
  });
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
        await safeHandle('handleReadButton', () => handleReadButton(interaction));
        return;
      }

      if (customId === 'ow_role_confirm') {
        await safeHandle('handleConfirmButton', () => handleConfirmButton(interaction));
        return;
      }

      if (customId.startsWith('ow_role_')) {
        await safeHandle('handleRoleToggle', () => handleRoleToggle(interaction));
        return;
      }

      if (customId.startsWith('ow_limit_')) {
        await safeHandle('handleLimitButton', () => handleLimitButton(interaction));
        return;
      }
    }
  },
};

async function handleReadButton(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = getConfig();
  if (!config) {
    return interaction.editReply({ content: '系統尚未初始化，請聯絡管理員 <@357462526465933313>。' });
  }

  const member = interaction.member;
  const currentKeys = ROLE_DEFS
    .filter(({ key }) => {
      const roleId = config.roles[key];
      return roleId && member.roles.cache.has(roleId);
    })
    .map(({ key }) => key);

  const embed = new EmbedBuilder()
    .setTitle('選擇你的 OW 角色')
    .setDescription('點擊按鈕選取或取消角色（可複選），選完後按「✅ 確認」完成設定。')
    .setColor(0x5865F2);

  await interaction.editReply({ embeds: [embed], components: buildRoleRows(currentKeys) });
}

async function handleRoleToggle(interaction) {
  const roleRow = interaction.message.components[0];
  const clickedId = interaction.customId;

  const currentKeys = roleRow.components
    .filter(btn => btn.style === ButtonStyle.Primary)
    .map(btn => ROLE_DEFS.find(r => r.customId === btn.customId)?.key)
    .filter(Boolean);

  const clickedDef = ROLE_DEFS.find(r => r.customId === clickedId);
  const newKeys = currentKeys.includes(clickedDef.key)
    ? currentKeys.filter(k => k !== clickedDef.key)
    : [...currentKeys, clickedDef.key];

  await interaction.deferUpdate();
  await interaction.editReply({ components: buildRoleRows(newKeys) });
}

async function handleConfirmButton(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const config = getConfig();
  if (!config) {
    return interaction.editReply({ content: '系統尚未初始化，請聯絡管理員 <@357462526465933313>。' });
  }

  const roleRow = interaction.message.components[0];
  const selectedKeys = roleRow.components
    .filter(btn => btn.style === ButtonStyle.Primary)
    .map(btn => ROLE_DEFS.find(r => r.customId === btn.customId)?.key)
    .filter(Boolean);

  const member = interaction.member;

  // Check first-time before modifying roles
  const unverifiedId = config.roles.unverified;
  const isFirstTime = unverifiedId && member.roles.cache.has(unverifiedId);

  const FALLBACK_ROLE_ID = '1479733427518308384'; // 待驗證

  // Apply / remove each role to match selection
  let assignFailed = false;
  for (const { key } of ROLE_DEFS) {
    const roleId = config.roles[key];
    if (!roleId) continue;
    const shouldHave = selectedKeys.includes(key);
    const hasRole = member.roles.cache.has(roleId);
    if (shouldHave && !hasRole) {
      try {
        // Verify role still exists before adding
        const roleExists = interaction.guild.roles.cache.has(roleId);
        if (!roleExists) {
          console.error(`[handleConfirmButton] 身分組不存在 key=${key} roleId=${roleId}`);
          assignFailed = true;
          continue;
        }
        await member.roles.add(roleId);
      } catch (err) {
        console.error(`[handleConfirmButton] 新增身分組失敗 key=${key} roleId=${roleId} userId=${member.id}:`, err);
        assignFailed = true;
      }
    } else if (!shouldHave && hasRole) {
      await member.roles.remove(roleId).catch(() => {});
    }
  }

  if (assignFailed) {
    await member.roles.add(FALLBACK_ROLE_ID).catch(() => {});
    return interaction.editReply({ content: '⚠️ 身分組設定時發生錯誤，已暫時給予待驗證身分組，請聯絡管理員 <@357462526465933313>。' });
  }

  if (isFirstTime && selectedKeys.length > 0) {
    const tempRoleId = process.env.TEMP_ROLE_ID;
    if (tempRoleId) await member.roles.remove(tempRoleId).catch(() => {});
    await member.roles.remove(unverifiedId).catch(() => {});

    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (welcomeChannelId) {
      const welcomeChannel = interaction.client.channels.cache.get(welcomeChannelId);
      if (welcomeChannel) {
        const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        await welcomeChannel.send(randomMsg.replace('{user}', `<@${member.id}>`));
      }
    }

    return interaction.editReply({ content: '✅ 已獲得身分組！現在可以進入其他頻道了。' });
  }

  if (selectedKeys.length === 0) {
    return interaction.editReply({ content: '沒有選擇任何角色，設定未變更。' });
  }

  await interaction.editReply({ content: '✅ 角色設定已更新。' });
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

  room.limit = limit;
  lfgRooms.set(channelId, room);

  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${room.ownerName} 的組隊房間`)
    .setDescription(
      '點擊按鈕調整人數上限\n\n' +
      '-# 💡 揪人打競技的話請附上分段，好找到適合的隊友。',
    )
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
