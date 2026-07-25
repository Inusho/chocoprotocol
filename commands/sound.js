// Command: !sound
const soundboard = require('../modules/soundboard');

module.exports = {
  name: 'sound',
  aliases: ['play', 'sb'],
  description: 'Spielt einen Sound ab (!sound liste für alle Sounds)',
  cooldown: 10,

  execute(client, channel, tags, args) {
    if (!args[0] || args[0] === 'liste' || args[0] === 'list') {
      const sounds = soundboard.getSoundList();
      if (sounds.length === 0) {
        client.say(channel, '🔇 Keine Sounds vorhanden. Lege .mp3 oder .wav Dateien in den sounds/ Ordner.');
      } else {
        client.say(channel, `🔊 Verfügbare Sounds: ${sounds.join(', ')}`);
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
