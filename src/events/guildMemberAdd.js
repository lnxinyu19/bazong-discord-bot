const welcomeMessages = require('../config/welcomeMessages');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.client.channels.cache.get(channelId);
    if (!channel) return;

    const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const formatted = randomMsg.replace('{user}', `<@${member.id}>`);
    channel.send(formatted);
  },
};
