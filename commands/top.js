// Command: !top
const watchtime = require('../modules/watchtime');

module.exports = {
  name: 'top',
  aliases: ['leaderboard', 'rangliste'],
  description: 'Zeigt die aktivsten Chatter',
  cooldown: 30,

  execute(client, channel, tags, args) {
    const count = Math.min(parseInt(args[0]) || 5, 10);
    const top = watchtime.getTopChatters(count);

    if (top.length === 0) {
      client.say(channel, 'Noch keine Daten vorhanden!');
      return;
    }

    const list = top
      .map((entry) => `${entry.rank}. ${entry.username} (${entry.formatted})`)
      .join(' | ');

    client.say(channel, `Top ${top.length} Chatter: ${list}`);
  },
};
