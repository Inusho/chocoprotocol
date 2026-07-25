// ============================================
// DISCORD - Webhook Benachrichtigungen
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'discord.json');

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
    enabled: true,
    events: {
      live: { enabled: true, message: '🔴 **{channel}** ist jetzt LIVE!\n🎮 {game}\n📝 {title}\n\n🔗 https://twitch.tv/{channel}' },
      offline: { enabled: false, message: '⚫ **{channel}** ist jetzt offline. Bis zum nächsten Mal!' },
      sub: { enabled: true, message: '🎉 **{user}** hat mit **{tier}** gesubbt!' },
      resub: { enabled: true, message: '💜 **{user}** ist seit **{months} Monaten** dabei! ({tier})' },
      raid: { enabled: true, message: '🚨 **{user}** raidet mit **{viewers}** Zuschauern!' },
      giftsub: { enabled: true, message: '🎁 **{user}** hat **{recipient}** ein Sub geschenkt!' },
      follow: { enabled: true, message: '💜 **{user}** folgt jetzt dem Kanal!' },
    },
  };
}

function getAll() {
  return settings;
}

function update(data) {
  if (data.enabled !== undefined) settings.enabled = data.enabled;
  if (data.events) {
    for (const [key, val] of Object.entries(data.events)) {
      if (settings.events[key]) {
        if (val.enabled !== undefined) settings.events[key].enabled = val.enabled;
        if (val.message !== undefined) settings.events[key].message = val.message;
      }
    }
  }
  save();
  return { success: true, settings };
}

function updateEvent(type, data) {
  if (!settings.events[type]) return { success: false, message: 'Unbekannter Event-Typ' };
  if (data.message !== undefined) settings.events[type].message = data.message;
  if (data.enabled !== undefined) settings.events[type].enabled = data.enabled;
  save();
  return { success: true, event: settings.events[type] };
}

function formatMessage(template, vars) {
  let msg = template;
  for (const [key, value] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return msg;
}

/**
 * Sendet eine Nachricht an den Discord Webhook
 */
async function sendWebhook(webhookUrl, content, embed = null) {
  if (!webhookUrl) return;

  const body = {};
  if (embed) {
    body.embeds = [embed];
  } else {
    body.content = content;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`❌ Discord Webhook Fehler: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error('❌ Discord Webhook Fehler:', err.message);
  }
}

/**
 * Sendet ein Event an Discord
 */
async function notify(webhookUrl, eventType, vars = {}) {
  if (!settings.enabled) return;
  if (!webhookUrl) return;

  const event = settings.events[eventType];
  if (!event || !event.enabled) return;

  const message = formatMessage(event.message, vars);

  // Für Live-Events ein schönes Embed senden
  if (eventType === 'live') {
    const embed = {
      title: `🔴 ${vars.channel} ist jetzt LIVE!`,
      description: vars.title || 'Stream gestartet!',
      color: 0x9147ff,
      fields: [],
      url: `https://twitch.tv/${vars.channel}`,
      timestamp: new Date().toISOString(),
      footer: { text: 'Twitch Bot' },
    };
    if (vars.game) {
      embed.fields.push({ name: '🎮 Spiel', value: vars.game, inline: true });
    }
    if (vars.viewers !== undefined) {
      embed.fields.push({ name: '👀 Zuschauer', value: String(vars.viewers), inline: true });
    }
    if (vars.thumbnail) {
      embed.image = { url: vars.thumbnail };
    }
    await sendWebhook(webhookUrl, null, embed);
  } else {
    await sendWebhook(webhookUrl, message);
  }
}

// Beim Laden initialisieren
load();

module.exports = {
  load,
  getAll,
  update,
  updateEvent,
  notify,
  sendWebhook,
};
