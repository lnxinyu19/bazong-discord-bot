const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/ow-setup.json');

function getOwConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const config = getOwConfig();
    if (config?.roles?.unverified) {
      await member.roles.add(config.roles.unverified).catch(() => {});
    }
  },
};
