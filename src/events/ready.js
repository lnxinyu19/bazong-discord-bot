const { scheduleWeatherNotification } = require('../services/weatherScheduler');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`Bot 已上線！登入為 ${client.user.tag}`);

    // 啟動天氣通知排程（每天早上 8 點）
    scheduleWeatherNotification(client);
  },
};
