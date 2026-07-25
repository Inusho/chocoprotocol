require('dotenv').config();
const settings = require('./modules/settings');

const s = settings.getAll();

module.exports = {
  // Twitch Verbindung
  bot: {
    username: s.twitch?.botUsername || '',
    oauthToken: s.twitch?.oauthToken || '',
    channel: s.twitch?.channel || '',
  },

  // Command Einstellungen
  prefix: s.twitch?.prefix || '!',

  // Discord Einstellungen
  discord: {
    webhookUrl: s.discord?.webhookUrl || '',
  },

  // Twitch API (für Live-Erkennung)
  twitch: {
    clientId: s.discord?.twitchClientId || '',
    clientSecret: s.discord?.twitchClientSecret || '',
    pollInterval: s.discord?.pollInterval || 60000,
  },

  // Moderation Einstellungen
  moderation: s.moderation || {
    blockLinks: true,
    linkWhitelist: ['moderator', 'vip', 'broadcaster'],
    maxCapsPercent: 70,
    minCapsLength: 10,
    bannedWords: [],
    timeoutDuration: 10,
  },

  // Soundboard Einstellungen
  soundboard: s.soundboard || {
    soundsFolder: './sounds',
    cooldown: 10,
  },
};
