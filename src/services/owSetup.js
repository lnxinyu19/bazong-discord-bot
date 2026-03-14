const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/ow-setup.json');

const OW_ROLES = [
  { key: 'tank',    name: '🛡️ 坦克', color: 0x5865F2 },
  { key: 'support', name: '💚 輔助', color: 0x57F287 },
  { key: 'dps',     name: '⚔️ 輸出', color: 0xED4245 },
  { key: 'flex',    name: '🔄 補位', color: 0xFEE75C },
];

function buildAnnouncement(roles) {
  const tank    = `<@&${roles.tank}>`;
  const support = `<@&${roles.support}>`;
  const dps     = `<@&${roles.dps}>`;
  const flex    = `<@&${roles.flex}>`;

  return `安安 相信各位加入就是想找一起玩的夥伴

不要害羞 主動揪人

為了大家的遊戲體驗，請遵守以下事項：

🔹 不氣氛隊友，不適合就不要勉強一起玩，實力落差很大的話，雙方體驗也不好。

🔹 嚴禁騷擾任何人，如有發生讓你感到不舒服/被騷擾的事情請告知我，會視情況踢除。

🔹 私人糾紛、遊戲糾紛請自行解決，請勿上升至群組。本群不鼓勵副本，要發副本請告知管理員吃瓜。

🔹 選完身分組即可看到其他頻道。

🔹 想找人玩可以到組隊大廳找隊友。

🔹 找隊友不僅限超越手錶的隊友，其他遊戲也歡迎大家。

💡 想找隊友？去組隊大廳 tag ${tank} ${support} ${dps} ${flex} 喊人，有緣自然來。`;
}

/**
 * 執行 OW setup（冪等：已存在的角色/頻道不會重複建立）
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{ roles, hubChannel, textChannel, roleSelectionChannel }>}
 */
async function runOwSetup(guild) {
  const categoryId = process.env.LFG_CATEGORY_ID;
  await guild.channels.fetch();
  const category = guild.channels.cache.get(categoryId);
  if (!category) {
    console.error(`[OW Setup] LFG_CATEGORY_ID="${categoryId}"，伺服器頻道清單：`);
    guild.channels.cache.forEach((c) => console.error(`  ${c.id} ${c.type} ${c.name}`));
    throw new Error('找不到分類，請確認 LFG_CATEGORY_ID 設定正確。');
  }

  const roles = {};

  let unverifiedRole = guild.roles.cache.find((x) => x.name === '待驗證');
  if (!unverifiedRole) unverifiedRole = await guild.roles.create({ name: '待驗證', color: 0x99aab5 });
  roles.unverified = unverifiedRole.id;

  for (const r of OW_ROLES) {
    let role = guild.roles.cache.find((x) => x.name === r.name);
    if (!role) role = await guild.roles.create({ name: r.name, color: r.color });
    roles[r.key] = role.id;
  }

  const everyoneRole = guild.roles.everyone;
  const owRoleObjects = OW_ROLES.map((r) => guild.roles.cache.get(roles[r.key]));

  let isNewRoleChannel = false;
  let roleSelectionChannel = guild.channels.cache.find(
    (c) => c.name === '選擇身分組' && c.parentId === null,
  );
  if (!roleSelectionChannel) {
    isNewRoleChannel = true;
    roleSelectionChannel = await guild.channels.create({
      name: '選擇身分組',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: everyoneRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
        { id: unverifiedRole.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] },
      ],
    });
  }

  const owVoiceOverwrites = [
    { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...owRoleObjects.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel] })),
  ];

  let hubChannel = guild.channels.cache.find(
    (c) => c.name === '➕ 找人組隊' && c.parentId === categoryId,
  );
  if (!hubChannel) {
    hubChannel = await guild.channels.create({
      name: '➕ 找人組隊',
      type: ChannelType.GuildVoice,
      parent: categoryId,
      permissionOverwrites: owVoiceOverwrites,
    });
  }

  const owTextOverwrites = [
    { id: everyoneRole.id, deny: [PermissionFlagsBits.ViewChannel] },
    ...owRoleObjects.map((r) => ({
      id: r.id,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.SendMessages],
    })),
  ];

  let isNewTextChannel = false;
  let textChannel = guild.channels.cache.find(
    (c) => c.name === '組隊大廳' && c.parentId === categoryId,
  );
  if (!textChannel) {
    isNewTextChannel = true;
    textChannel = await guild.channels.create({
      name: '組隊大廳',
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites: owTextOverwrites,
    });
  }

  const config = {
    hubChannelId: hubChannel.id,
    textChannelId: textChannel.id,
    roleSelectionChannelId: roleSelectionChannel.id,
    roleMessageId: null,
    roles,
  };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  if (isNewTextChannel) {
    const guideEmbed = new EmbedBuilder()
      .setTitle('⚔️ 組隊大廳使用說明')
      .setDescription(
        '想找人？進「➕ 找人組隊」語音頻道，不用做任何事，房間自動幫你開好。\n\n' +
        '**控制面板**出現在這個頻道，房主可以調整人數上限（2人～不限制）。\n\n' +
        '所有人離開後房間自動刪除，不用手動收拾，我替你善後了。\n\n' +
        '-# 此頻道的訊息會發送通知，嫌吵的話自己去關。',
      )
      .setColor(0xfa7454);
    const guideMsg = await textChannel.send({ embeds: [guideEmbed] });
    await guideMsg.pin().catch(() => {});
  }

  if (isNewRoleChannel) {
    const announcementEmbed = new EmbedBuilder()
      .setTitle('📋 入群須知')
      .setDescription(buildAnnouncement(roles))
      .setColor(0xfa7454);
    const readRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ow_read').setLabel('✅ 我已閱讀').setStyle(ButtonStyle.Success),
    );
    await roleSelectionChannel.send({ embeds: [announcementEmbed], components: [readRow] });
  }

  return { roles, hubChannel, textChannel, roleSelectionChannel };
}

module.exports = { runOwSetup, OW_ROLES, CONFIG_PATH };
