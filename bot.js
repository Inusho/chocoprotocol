// ============================================
// TWITCH BOT - Hauptdatei
// ============================================

const tmi = require('tmi.js');
const config = require('./config');
const settings = require('./modules/settings');
const { loadCommands, handleCommand } = require('./commands');
const moderation = require('./modules/moderation');
const notifications = require('./modules/notifications');
const soundboard = require('./modules/soundboard');
const customCommands = require('./modules/custom-commands');
const dashboard = require('./dashboard/server');
const discord = require('./modules/discord');
const twitchApi = require('./modules/twitch-api');
const eventsub = require('./modules/eventsub');
const timers = require('./modules/timers');
const watchtime = require('./modules/watchtime');

// Commands laden
loadCommands();

// Dashboard IMMER starten (auch ohne Twitch-Verbindung)
dashboard.init(null, config);

console.log('🤖 Twitch Bot wird gestartet...');

// Prüfe ob die Konfiguration vollständig ist
if (!settings.isConfigured()) {
  console.log('⚠️  Bot ist noch nicht konfiguriert.');
  console.log('   Öffne das Dashboard und trage deine Einstellungen ein.');
} else {
  // TMI.js Client erstellen
  const client = new tmi.Client({
    options: { debug: true },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: {
      username: config.bot.username,
      password: config.bot.oauthToken,
    },
    channels: [config.bot.channel],
  });

  // Dashboard den Client übergeben
  dashboard.setClient(client);

  // === EVENT: Verbindung hergestellt ===
  client.on('connected', (address, port) => {
    console.log(`✅ Bot verbunden mit ${address}:${port}`);
    console.log(`📺 Kanal: #${config.bot.channel}`);

    // Timer starten
    timers.startAll((msg) => client.say(`#${config.bot.channel}`, msg));
  });

  // === EVENT: Neue Nachricht im Chat ===
  client.on('message', (channel, tags, message, self) => {
    if (self) {
      dashboard.logMessage(tags, message, true);
      return;
    }

    // Stream Together: Nachrichten aus fremden Kanälen nur anzeigen, nicht verarbeiten
    const sourceChannel = tags['source-room-login'];
    const isFromOtherChannel = sourceChannel && sourceChannel.toLowerCase() !== config.bot.channel.toLowerCase();

    // Nachrichten für Timer zählen (nur eigener Kanal)
    if (!isFromOtherChannel) {
      timers.countMessage();
    }

    // Watchtime tracken (nur eigener Kanal)
    if (!isFromOtherChannel) {
      watchtime.trackMessage(tags['display-name'] || tags.username);
    }

    dashboard.logMessage(tags, message);

    // Bei fremden Kanälen: Keine Moderation, keine Commands
    if (isFromOtherChannel) return;

    const isMod = tags.mod || tags.badges?.broadcaster === '1';
    if (!isMod) {
      const moderationResult = moderation.check(message, tags);
      if (moderationResult) {
        client.timeout(channel, tags.username, moderationResult.duration, moderationResult.reason);
        client.say(channel, `@${tags['display-name']} ${moderationResult.message}`);
        dashboard.logTimeout(tags.username, moderationResult.reason);
        return;
      }
    }

    if (message.startsWith(config.prefix)) {
      const args = message.slice(config.prefix.length).trim().split(/\s+/);
      const cmdName = args[0].toLowerCase();

      const wasCustom = customCommands.execute(client, channel, tags, cmdName, args.slice(1));
      if (!wasCustom) {
        handleCommand(client, channel, tags, message);
      }
      dashboard.logCommand(tags.username, message);
    }
  });

  // === EVENT: Neuer Sub ===
  client.on('subscription', (channel, username, methods, message, tags) => {
    notifications.onSub(client, channel, username, methods);
    dashboard.logEvent('sub', { username });
    const tier = methods.plan === '3000' ? 'Tier 3' : methods.plan === '2000' ? 'Tier 2' : 'Tier 1';
    discord.notify(config.discord.webhookUrl, 'sub', { user: username, tier });
  });

  // === EVENT: Resub ===
  client.on('resub', (channel, username, months, message, tags, methods) => {
    notifications.onResub(client, channel, username, months, methods);
    dashboard.logEvent('resub', { username, months });
    const tier = methods.plan === '3000' ? 'Tier 3' : methods.plan === '2000' ? 'Tier 2' : 'Tier 1';
    discord.notify(config.discord.webhookUrl, 'resub', { user: username, months, tier });
  });

  // === EVENT: Raid ===
  client.on('raided', (channel, username, viewers) => {
    notifications.onRaid(client, channel, username, viewers);
    dashboard.logEvent('raid', { username, viewers });
    discord.notify(config.discord.webhookUrl, 'raid', { user: username, viewers });
  });

  // === EVENT: Gift Sub ===
  client.on('subgift', (channel, username, streakMonths, recipient, methods, tags) => {
    notifications.onGiftSub(client, channel, username, recipient);
    dashboard.logEvent('giftsub', { gifter: username, recipient });
    discord.notify(config.discord.webhookUrl, 'giftsub', { user: username, recipient });
  });

  // Bot verbinden
  client.connect().catch((err) => {
    console.error('❌ Verbindungsfehler:', err);
  });

  // Discord & Twitch API Live-Erkennung starten
  if (config.discord.webhookUrl) {
    console.log('📨 Discord Webhook konfiguriert');
    twitchApi.startPolling({
      clientId: config.twitch.clientId,
      clientSecret: config.twitch.clientSecret,
      channel: config.bot.channel,
      intervalMs: config.twitch.pollInterval,
      onLive: (data) => {
        discord.notify(config.discord.webhookUrl, 'live', data);
        dashboard.logEvent('live', data);
      },
      onOffline: (data) => {
        discord.notify(config.discord.webhookUrl, 'offline', data);
        dashboard.logEvent('offline', data);
      },
    });
  } else {
    console.log('⚠️  Discord: Kein Webhook konfiguriert – Discord-Benachrichtigungen deaktiviert');
  }

  // EventSub für Follow-Events starten
  if (config.twitch.clientId) {
    eventsub.connect({
      clientId: config.twitch.clientId,
      accessToken: config.bot.oauthToken,
      channel: config.bot.channel,
      onFollow: (username) => {
        notifications.onFollow(client, `#${config.bot.channel}`, username);
        dashboard.logEvent('follow', { username });
        discord.notify(config.discord.webhookUrl, 'follow', { user: username });
      },
    });
  }
}
