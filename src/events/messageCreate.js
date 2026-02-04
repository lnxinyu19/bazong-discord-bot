const { keywords, quotes } = require('../config/bazongQuotes');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // 忽略機器人訊息
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // 檢查是否包含關鍵字
    const triggered = keywords.some((keyword) => content.includes(keyword.toLowerCase()));

    if (triggered) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      await message.reply(randomQuote);
    }
  },
};
