const { scheduleWeatherNotification } = require('../services/weatherScheduler');
const { runOwSetup } = require('../services/owSetup');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`Bot 已上線！登入為 ${client.user.tag}`);
    scheduleWeatherNotification(client);

    if (process.env.LFG_CATEGORY_ID) {
      const guild = client.guilds.cache.first();
      if (guild) {
        runOwSetup(guild)
          .then(() => console.log('[OW Setup] 自動初始化完成'))
          .catch((err) => console.error('[OW Setup] 自動初始化失敗:', err));
      }
    }
  },
};
