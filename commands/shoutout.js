// Command: !so / !shoutout
const config = require('../config');

module.exports = {
  name: 'so',
  aliases: ['shoutout'],
  description: 'Shoutout für einen Streamer (!so @username)',
  cooldown: 5,
  modOnly: true,

  async execute(client, channel, tags, args) {
    if (!args[0]) {
      client.say(channel, `@${tags['display-name']} Benutze: !so @username`);
      return;
    }

    const username = args[0].replace('@', '').toLowerCase();
    const info = await getChannelInfo(username);

    if (info) {
      const game = info.game ? ` | Zuletzt: ${info.game}` : '';
      client.say(
        channel,
        `📢 Schaut mal bei @${info.displayName} vorbei!${game} → twitch.tv/${username}`
      );
    } else {
      client.say(channel, `📢 Schaut mal bei @${username} vorbei! → twitch.tv/${username}`);
    }
  },
};

/**
 * Holt Kanal-Infos von der Twitch API
 */
async function getChannelInfo(username) {
  const config = require('../config');
  const clientId = config.twitch.clientId;
  const token = config.bot.oauthToken?.replace(/^oauth:/i, '');

  if (!clientId || !token) return null;

  try {
    // User-ID holen
    const userRes = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const userData = await userRes.json();
    const user = userData.data?.[0];
    if (!user) return null;

    // Channel-Info holen
    const channelRes = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${user.id}`,
      {
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const channelData = await channelRes.json();
    const ch = channelData.data?.[0];

    return {
      displayName: user.display_name,
      game: ch?.game_name || '',
    };
  } catch (err) {
    console.error('Shoutout API-Fehler:', err.message);
    return null;
  }
}

// Export für Auto-Shoutout bei Raids
module.exports.getChannelInfo = getChannelInfo;
