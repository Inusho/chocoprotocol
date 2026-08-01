// Command: !watchtime
const watchtime = require('../modules/watchtime');

module.exports = {
  name: 'watchtime',
  aliases: ['wt'],
  description: 'Zeigt deine Chat-Aktivität',
  cooldown: 10,

  execute(client, channel, tags, args) {
    // Optional: Watchtime eines anderen Users abfragen
    const target = args[0] ? args[0].replace('@', '') : tags['display-name'];
    const result = watchtime.getWatchtime(target);

    if (!result.found) {
      client.say(channel, `@${tags['display-name']} ${target} war noch nicht im Chat aktiv.`);
    } else {
      if (target.toLowerCase() === tags['display-name'].toLowerCase()) {
        client.say(channel, `@${tags['display-name']} du warst bisher ${result.formatted} aktiv im Chat!`);
      } else {
        client.say(channel, `@${tags['display-name']} ${target} war bisher ${result.formatted} aktiv im Chat!`);
      }
    }
  },
};
