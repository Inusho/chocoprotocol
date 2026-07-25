// ============================================
// DASHBOARD - Web-Oberfläche für den Bot
// ============================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const customCommands = require('../modules/custom-commands');
const settings = require('../modules/settings');
const soundboard = require('../modules/soundboard');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let currentClient = null;

// Socket.IO an Soundboard übergeben
soundboard.setIO(io);

// Statische Dateien (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
// Sound-Dateien als /sounds/ URL bereitstellen
app.use('/sounds', express.static(path.join(__dirname, '..', 'sounds')));
app.use(express.json());

// === API Routen für Command-Verwaltung ===

// Alle Commands abrufen
app.get('/api/commands', (req, res) => {
  const { commands: builtinCommands, isDisabled } = require('../commands');
  const builtIn = [...new Set(builtinCommands.values())].map((cmd) => ({
    name: cmd.name,
    description: cmd.description || '',
    aliases: cmd.aliases || [],
    cooldown: cmd.cooldown || 3,
    modOnly: cmd.modOnly || false,
    enabled: !isDisabled(cmd.name),
    type: 'builtin',
  }));

  const custom = Object.values(customCommands.getAll()).map((cmd) => ({
    ...cmd,
    type: 'custom',
  }));

  res.json({ builtin: builtIn, custom });
});

// Neuen Custom Command erstellen
app.post('/api/commands', (req, res) => {
  const { name, response, cooldown, modOnly } = req.body;
  if (!name || !response) {
    return res.status(400).json({ error: 'Name und Antwort sind Pflichtfelder' });
  }
  const result = customCommands.set(name, { response, cooldown, modOnly });
  res.json(result);
});

// Custom Command aktualisieren
app.put('/api/commands/:name', (req, res) => {
  const { response, cooldown, modOnly } = req.body;
  const result = customCommands.set(req.params.name, { response, cooldown, modOnly });
  res.json(result);
});

// Custom Command löschen
app.delete('/api/commands/:name', (req, res) => {
  const result = customCommands.remove(req.params.name);
  res.json(result);
});

// Custom Command ein-/ausschalten
app.patch('/api/commands/:name/toggle', (req, res) => {
  const result = customCommands.toggle(req.params.name);
  res.json(result);
});

// Built-In Command ein-/ausschalten
app.patch('/api/commands/:name/toggle-builtin', (req, res) => {
  const { toggleBuiltin } = require('../commands');
  const result = toggleBuiltin(req.params.name);
  res.json(result);
});

// === API Routen für Notifications ===
const notifications = require('../modules/notifications');

// Alle Notification-Einstellungen abrufen
app.get('/api/notifications', (req, res) => {
  res.json(notifications.getAll());
});

// Notification-Einstellung aktualisieren
app.put('/api/notifications/:type', (req, res) => {
  const { message, enabled } = req.body;
  const result = notifications.update(req.params.type, { message, enabled });
  res.json(result);
});

// === API Routen für Discord ===
const discord = require('../modules/discord');
const twitchApi = require('../modules/twitch-api');

// Discord-Einstellungen abrufen
app.get('/api/discord', (req, res) => {
  res.json(discord.getAll());
});

// Discord-Event aktualisieren
app.put('/api/discord/:type', (req, res) => {
  const { message, enabled } = req.body;
  const result = discord.updateEvent(req.params.type, { message, enabled });
  res.json(result);
});

// Discord global ein-/ausschalten
app.patch('/api/discord/toggle', (req, res) => {
  const current = discord.getAll();
  const result = discord.update({ enabled: !current.enabled });
  res.json(result);
});

// Stream-Status abrufen
app.get('/api/stream-status', (req, res) => {
  res.json(twitchApi.getStatus());
});

// === API Routen für Settings ===

// Alle Settings abrufen (Secrets maskiert)
app.get('/api/settings', (req, res) => {
  res.json({
    settings: settings.getMasked(),
    configured: settings.isConfigured(),
  });
});

// Settings aktualisieren
app.put('/api/settings', (req, res) => {
  const result = settings.update(req.body);
  res.json({
    ...result,
    configured: settings.isConfigured(),
    restartRequired: true,
  });
});

// Bot neustarten (Docker restart policy startet ihn neu)
app.post('/api/restart', (req, res) => {
  res.json({ success: true, message: 'Bot wird neu gestartet...' });
  console.log('🔄 Neustart angefordert über Dashboard...');
  setTimeout(() => process.exit(0), 500);
});

// Dashboard-State
const state = {
  connected: false,
  channel: '',
  chatLog: [],
  events: [],
  stats: {
    messagesTotal: 0,
    commandsUsed: 0,
    timeouts: 0,
  },
};

// Maximal 200 Nachrichten im Log behalten
const MAX_LOG = 200;

/**
 * Registriert einen Twitch Client beim Dashboard
 */
function setClient(client) {
  currentClient = client;

  client.on('connected', () => {
    state.connected = true;
    io.emit('status', { connected: true });
  });

  client.on('disconnected', () => {
    state.connected = false;
    io.emit('status', { connected: false });
  });
}

/**
 * Initialisiert das Dashboard
 */
function init(client, config) {
  state.channel = config.bot?.channel || '';

  if (client) {
    setClient(client);
  }

  // WebSocket Verbindung vom Browser
  io.on('connection', (socket) => {
    // Aktuellen State senden
    socket.emit('init', {
      connected: state.connected,
      channel: state.channel,
      chatLog: state.chatLog.slice(-50),
      events: state.events.slice(-20),
      stats: state.stats,
      configured: settings.isConfigured(),
    });

    // Chat-Nachricht vom Dashboard senden
    socket.on('sendMessage', (message) => {
      if (message && state.connected && currentClient) {
        currentClient.say(`#${state.channel}`, message);
      }
    });
  });

  // Dashboard-Server starten
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  });
}

/**
 * Neue Chat-Nachricht loggen
 */
function logMessage(tags, message, isBot = false) {
  const entry = {
    time: new Date().toLocaleTimeString('de-DE'),
    username: tags['display-name'] || tags.username || 'Bot',
    message,
    color: tags.color || '#9147ff',
    badges: tags.badges || {},
    isBot,
    sourceChannel: tags['source-room-login'] || null,
  };

  state.chatLog.push(entry);
  if (state.chatLog.length > MAX_LOG) state.chatLog.shift();
  state.stats.messagesTotal++;

  io.emit('chat', entry);
  io.emit('stats', state.stats);
}

/**
 * Command-Nutzung loggen
 */
function logCommand(username, command) {
  state.stats.commandsUsed++;
  io.emit('stats', state.stats);
}

/**
 * Event loggen (Sub, Raid, etc.)
 */
function logEvent(type, data) {
  const entry = {
    time: new Date().toLocaleTimeString('de-DE'),
    type,
    ...data,
  };

  state.events.push(entry);
  if (state.events.length > 50) state.events.shift();

  io.emit('event', entry);
}

/**
 * Timeout loggen
 */
function logTimeout(username, reason) {
  state.stats.timeouts++;
  io.emit('stats', state.stats);
  logEvent('timeout', { username, reason });
}

module.exports = { init, setClient, logMessage, logCommand, logEvent, logTimeout };
