const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const lfgRooms = require('../state/lfgRooms');

const CONFIG_PATH = path.join(__dirname, '../config/ow-setup.json');

function getConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function buildControlEmbed(displayName, current, limit) {
  const limitDisplay = limit === 0 ? '∞' : limit;
  return new EmbedBuilder()
    .setTitle(`⚔️ ${displayName} 的組隊房間`)
    .setDescription(
      '點擊按鈕調整人數上限\n\n' +
      '-# 💡 揪人打競技的話請附上分段，好找到適合的隊友。',
    )
    .setColor(0xfa7454)
    .addFields({ name: '目前人數', value: `${current}/${limitDisplay}`, inline: true });
}

function buildLimitRow(channelId, selected) {
  return new ActionRowBuilder().addComponents(
    [2, 3, 4, 5, 0].map((n) =>
      new ButtonBuilder()
        .setCustomId(`ow_limit_${n}_${channelId}`)
        .setLabel(n === 0 ? '不限制' : `${n}人`)
        .setStyle(n === selected ? ButtonStyle.Primary : ButtonStyle.Secondary),
    ),
  );
}

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const config = getConfig();
    if (!config) return;

    const guild = newState.guild ?? oldState.guild;

    // 加入 hub 頻道 → 建立新語音頻道
    if (newState.channelId === config.hubChannelId) {
      const member = newState.member;
      const category = guild.channels.cache.get(process.env.LFG_CATEGORY_ID);

      const voiceChannel = await guild.channels.create({
        name: `⚔️ ${member.displayName}的房間`,
        type: ChannelType.GuildVoice,
        parent: category,
        userLimit: 5,
      });

      await member.voice.setChannel(voiceChannel);

      const textChannel = guild.channels.cache.get(config.textChannelId);
      if (textChannel) {
        const embed = buildControlEmbed(member.displayName, 1, 5);
        const row = buildLimitRow(voiceChannel.id, 5);
        const msg = await textChannel.send({
          content: `${member} 開了一個房間！`,
          embeds: [embed],
          components: [row],
        });

        lfgRooms.set(voiceChannel.id, {
          ownerId: member.id,
          ownerName: member.displayName,
          limit: 5,
          textChannelId: config.textChannelId,
          messageId: msg.id,
        });
      }
    }

    // 離開頻道 → 若空了就刪除語音頻道和組隊大廳的對應訊息
    if (oldState.channelId) {
      const channel = oldState.channel;
      if (channel && channel.members.size === 0) {
        const isLfgChannel = lfgRooms.has(oldState.channelId) || channel.name.startsWith('⚔️');
        if (!isLfgChannel) return;

        const room = lfgRooms.get(oldState.channelId);
        lfgRooms.delete(oldState.channelId);

        const textChannelId = room?.textChannelId ?? config.textChannelId;
        const textChannel = guild.channels.cache.get(textChannelId);
        if (textChannel) {
          if (room?.messageId) {
            await textChannel.messages.fetch(room.messageId)
              .then((msg) => msg.delete())
              .catch(() => {});
          } else {
            // Bot 重啟後 lfgRooms 為空，改用按鈕 customId 搜尋對應的控制訊息
            const messages = await textChannel.messages.fetch({ limit: 50 }).catch(() => null);
            if (messages) {
              const controlMsg = messages.find((m) =>
                m.components?.[0]?.components?.some((btn) =>
                  btn.customId?.includes(oldState.channelId),
                ),
              );
              if (controlMsg) await controlMsg.delete().catch(() => {});
            }
          }
        }

        await channel.delete().catch(() => {});
      }
    }
  },
};
