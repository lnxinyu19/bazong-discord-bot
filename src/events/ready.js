const { scheduleWeatherNotification } = require('../services/weatherScheduler');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Bot 已上線！登入為 ${client.user.tag}`);
    scheduleWeatherNotification(client);
  },
};
