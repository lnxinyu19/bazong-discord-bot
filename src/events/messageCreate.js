const { keywords, quotes, mediaQuotes } = require('../config/bazongQuotes');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // 忽略機器人訊息
    if (message.author.bot) return;

    // 分享頻道：回覆圖片/影片
    const shareChannelId = process.env.SHARE_CHANNEL_ID;
    if (shareChannelId && message.channel.id === shareChannelId) {
      const hasMedia = message.attachments.some((att) => {
        const type = att.contentType || '';
        return type.startsWith('image/') || type.startsWith('video/');
      });
      if (hasMedia) {
        const randomQuote = mediaQuotes[Math.floor(Math.random() * mediaQuotes.length)];
        await message.reply(randomQuote);
        return;
      }
    }

    const content = message.content.toLowerCase();

    // 檢查是否包含關鍵字
    const triggered = keywords.some((keyword) => content.includes(keyword.toLowerCase()));

    if (triggered) {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      await message.reply(randomQuote);
    }
  },
};
