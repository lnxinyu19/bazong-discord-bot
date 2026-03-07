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
  return new EmbedBuilder()
    .setTitle(`⚔️ ${displayName} 的組隊房間`)
    .setDescription('點擊按鈕調整人數上限')
    .setColor(0xfa7454)
    .addFields({ name: '目前人數', value: `${current}/${limit}`, inline: true });
}

function buildLimitRow(channelId, selected) {
  return new ActionRowBuilder().addComponents(
    [2, 3, 4, 5].map((n) =>
      new ButtonBuilder()
        .setCustomId(`ow_limit_${n}_${channelId}`)
        .setLabel(`${n}人`)
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
        name: `⚔️ ${member.displayName}的房間 (1/5)`,
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
    if (oldState.channelId && lfgRooms.has(oldState.channelId)) {
      const channel = oldState.channel;
      if (channel && channel.members.size === 0) {
        const room = lfgRooms.get(oldState.channelId);
        lfgRooms.delete(oldState.channelId);

        if (room?.textChannelId && room?.messageId) {
          const textChannel = guild.channels.cache.get(room.textChannelId);
          if (textChannel) {
            await textChannel.messages.fetch(room.messageId)
              .then((msg) => msg.delete())
              .catch(() => {});
          }
        }

        await channel.delete().catch(() => {});
      }
    }
  },
};
