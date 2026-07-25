// Command: !sound
const soundboard = require('../modules/soundboard');

module.exports = {
  name: 'sound',
  aliases: ['play', 'sb'],
  description: 'Spielt einen Sound ab (!sound liste für alle Sounds)',
  cooldown: 0, // Cooldown wird manuell im Soundboard-Modul verwaltet

  execute(client, channel, tags, args) {
    if (!args[0] || args[0] === 'liste' || args[0] === 'list') {
      const sounds = soundboard.getSoundList();
      if (sounds.length === 0) {
        client.say(channel, '🔇 Keine Sounds vorhanden.');
      } else {
        client.say(channel, `🔊 Sounds: ${sounds.join(', ')} → Benutze: !sound <name>`);
      }
      return;
    }

    const result = soundboard.play(args[0], tags['user-id']);
    if (result.success) {
      client.say(channel, `🔊 @${tags['display-name']} spielt: ${args[0]}`);
    } else {
      client.say(channel, `@${tags['display-name']} ${result.message}`);
    }
  },
};
