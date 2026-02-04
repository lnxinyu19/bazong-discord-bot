const welcomeMessages = require('../config/welcomeMessages');

module.exports = {
  name: 'guildMemberAdd',
  execute(member) {
    const channel = member.guild.systemChannel;
    if (!channel) return;

    const randomMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const formatted = randomMsg.replace('{user}', `<@${member.id}>`);
    channel.send(formatted);
  },
};
