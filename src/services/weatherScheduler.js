const { getWeatherMessage } = require('./weatherService');

const WEATHER_HOUR = 8;
const WEATHER_MINUTE = 0;

function calculateMsUntilNextRun() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(WEATHER_HOUR, WEATHER_MINUTE, 0, 0);

  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}

async function sendWeatherNotification(client) {
  const channelId = process.env.WEATHER_CHANNEL_ID;
  if (!channelId) {
    console.error('WEATHER_CHANNEL_ID 未設定，無法發送天氣通知');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error('找不到指定的天氣通知頻道');
      return;
    }

    const message = await getWeatherMessage();
    await channel.send(message);
    console.log(`[${new Date().toLocaleString()}] 天氣通知已發送`);
  } catch (error) {
    console.error('發送天氣通知時發生錯誤:', error);
  }
}

function scheduleWeatherNotification(client) {
  const runWeatherTask = async () => {
    await sendWeatherNotification(client);
    const nextMs = calculateMsUntilNextRun();
    console.log(`下次天氣通知將在 ${Math.round(nextMs / 1000 / 60)} 分鐘後發送`);
    setTimeout(runWeatherTask, nextMs);
  };

  const initialMs = calculateMsUntilNextRun();
  console.log(`天氣通知排程已啟動，首次發送將在 ${Math.round(initialMs / 1000 / 60)} 分鐘後`);
  setTimeout(runWeatherTask, initialMs);
}

module.exports = {
  scheduleWeatherNotification,
  sendWeatherNotification,
};
