// Command: !dice / !würfel
module.exports = {
  name: 'dice',
  aliases: ['würfel', 'roll'],
  description: 'Würfelt eine Zahl zwischen 1 und 6 (oder custom)',
  cooldown: 3,

  execute(client, channel, tags, args) {
    // Optional: eigene Obergrenze angeben (!dice 20)
    const max = parseInt(args[0]) || 6;
    const result = Math.floor(Math.random() * max) + 1;

    client.say(channel, `🎲 @${tags['display-name']} würfelt eine ${result} (von ${max})!`);
  },
};
