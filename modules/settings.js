// ============================================
// SETTINGS - Zentrale Einstellungsverwaltung
// ============================================
// Alle Einstellungen werden in data/settings.json gespeichert.
// Beim ersten Start werden Werte aus .env migriert.

const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');

let settings = {};

function load() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } else {
      settings = migrateFromEnv();
      save();
      console.log('📋 Einstellungen aus .env migriert → data/settings.json');
    }
  } catch (err) {
    console.error('❌ Einstellungen laden fehlgeschlagen:', err.message);
    settings = getDefaults();
    save();
  }
}

function migrateFromEnv() {
  const defaults = getDefaults();
  return {
    twitch: {
      botUsername: process.env.BOT_USERNAME || defaults.twitch.botUsername,
      oauthToken: process.env.BOT_OAUTH_TOKEN || defaults.twitch.oauthToken,
      channel: process.env.CHANNEL_NAME || defaults.twitch.channel,
      prefix: process.env.PREFIX || defaults.twitch.prefix,
    },
    discord: {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL || defaults.discord.webhookUrl,
      twitchClientId: process.env.TWITCH_CLIENT_ID || defaults.discord.twitchClientId,
      twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || defaults.discord.twitchClientSecret,
      pollInterval: parseInt(process.env.TWITCH_POLL_INTERVAL) || defaults.discord.pollInterval,
    },
    moderation: defaults.moderation,
    soundboard: defaults.soundboard,
  };
}

function getDefaults() {
  return {
    twitch: {
      botUsername: '',
      oauthToken: '',
      channel: '',
      prefix: '!',
    },
    discord: {
      webhookUrl: '',
      twitchClientId: '',
      twitchClientSecret: '',
      pollInterval: 60000,
    },
    moderation: {
      blockLinks: true,
      linkWhitelist: ['moderator', 'vip', 'broadcaster'],
      maxCapsPercent: 70,
      minCapsLength: 10,
      bannedWords: [],
      timeoutDuration: 10,
    },
    soundboard: {
      soundsFolder: './sounds',
      cooldown: 10,
    },
  };
}

function save() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getAll() {
  return settings;
}

function get(section) {
  return settings[section] || {};
}

function update(newSettings) {
  for (const [section, values] of Object.entries(newSettings)) {
    if (!settings[section]) settings[section] = {};
    if (typeof values === 'object' && !Array.isArray(values)) {
      for (const [key, value] of Object.entries(values)) {
        // Maskierte Werte ignorieren (behalte den alten Wert)
        if (typeof value === 'string' && value.startsWith('●')) continue;
        settings[section][key] = value;
      }
    } else {
      settings[section] = values;
    }
  }
  save();
  return { success: true };
}

function isConfigured() {
  return !!(
    settings.twitch?.botUsername &&
    settings.twitch?.oauthToken &&
    settings.twitch?.channel
  );
}

function getMasked() {
  const masked = JSON.parse(JSON.stringify(settings));
  if (masked.twitch?.oauthToken) {
    masked.twitch.oauthToken = maskValue(masked.twitch.oauthToken);
  }
  if (masked.discord?.twitchClientSecret) {
    masked.discord.twitchClientSecret = maskValue(masked.discord.twitchClientSecret);
  }
  return masked;
}

function maskValue(value) {
  if (!value || value.length < 8) return value ? '●●●●●●●●' : '';
  return '●●●●●●●●' + value.slice(-4);
}

// Sofort laden
load();

module.exports = { load, getAll, get, update, save, isConfigured, getMasked };
