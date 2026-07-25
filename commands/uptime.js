// Command: !uptime
module.exports = {
  name: 'uptime',
  aliases: [],
  description: 'Zeigt wie lange der Bot schon läuft',
  cooldown: 10,

  execute(client, channel, tags, args) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    let timeString = '';
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;

    client.say(channel, `⏱️ Bot läuft seit: ${timeString}`);
  },
};
