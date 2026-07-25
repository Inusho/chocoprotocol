// ============================================
// NOTIFICATIONS - Sub/Raid/Follow Benachrichtigungen
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

// Einstellungen laden
let settings = {};

function load() {
  try {
    settings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    settings = getDefaults();
    save();
  }
}

function save() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(settings, null, 2));
}

function getDefaults() {
  return {
    sub: { enabled: true, message: '🎉 {user} hat gerade mit {tier} gesubbt! Willkommen in der Community! ❤️' },
    resub: { enabled: true, message: '🎉 {user} ist seit {months} Monaten dabei ({tier})! Danke für den Support! 💜' },
    raid: { enabled: true, message: '🚨 RAID! {user} raidet mit {viewers} Zuschauern! Willkommen alle! 🎊' },
    giftsub: { enabled: true, message: '🎁 {user} hat {recipient} ein Sub geschenkt! Wie nett! 💝' },
    follow: { enabled: true, message: '💜 Willkommen {user}! Danke für den Follow!' },
  };
}

function getAll() {
  return settings;
}

function update(type, data) {
  if (!settings[type]) return { success: false, message: 'Unbekannter Event-Typ' };
  if (data.message !== undefined) settings[type].message = data.message;
  if (data.enabled !== undefined) settings[type].enabled = data.enabled;
  save();
  return { success: true, setting: settings[type] };
}

/**
 * Ersetzt Variablen im Template
 */
function formatMessage(template, vars) {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return msg;
}

/**
 * Neuer Subscriber
 */
function onSub(client, channel, username, methods) {
  if (!settings.sub?.enabled) return;
  const tier = methods.plan === '3000' ? 'Tier 3' : methods.plan === '2000' ? 'Tier 2' : 'Tier 1';
  const msg = formatMessage(settings.sub.message, { user: username, tier });
  client.say(channel, msg);
}

/**
 * Resub (erneutes Abo)
 */
function onResub(client, channel, username, months, methods) {
  if (!settings.resub?.enabled) return;
  const tier = methods.plan === '3000' ? 'Tier 3' : methods.plan === '2000' ? 'Tier 2' : 'Tier 1';
  const msg = formatMessage(settings.resub.message, { user: username, months, tier });
  client.say(channel, msg);
}

/**
 * Raid von einem anderen Kanal
 */
function onRaid(client, channel, username, viewers) {
  if (!settings.raid?.enabled) return;
  const msg = formatMessage(settings.raid.message, { user: username, viewers });
  client.say(channel, msg);
}

/**
 * Gift Sub (geschenktes Abo)
 */
function onGiftSub(client, channel, gifter, recipient) {
  if (!settings.giftsub?.enabled) return;
  const msg = formatMessage(settings.giftsub.message, { user: gifter, recipient });
  client.say(channel, msg);
}

/**
 * Follow
 */
function onFollow(client, channel, username) {
  if (!settings.follow?.enabled) return;
  const msg = formatMessage(settings.follow.message, { user: username });
  client.say(channel, msg);
}

// Beim Import laden
load();

module.exports = { onSub, onResub, onRaid, onGiftSub, onFollow, getAll, update };
