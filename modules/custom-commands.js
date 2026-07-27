// ============================================
// CUSTOM COMMANDS - Dynamisch erstellte Commands
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'custom-commands.json');

// Custom Commands im Speicher
let customCommands = {};

/**
 * Lädt custom Commands aus der JSON-Datei
 */
function load() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    customCommands = JSON.parse(data);
    console.log(`📝 ${Object.keys(customCommands).length} Custom Commands geladen`);
  } catch (err) {
    customCommands = {};
  }
}

/**
 * Speichert custom Commands in die JSON-Datei
 */
function save() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(customCommands, null, 2));
}

/**
 * Gibt alle custom Commands zurück
 */
function getAll() {
  return customCommands;
}

/**
 * Erstellt oder aktualisiert einen Command
 */
function set(name, data) {
  const key = name.toLowerCase().replace(/[^a-zäöü0-9_-]/g, '');
  if (!key) return { success: false, message: 'Ungültiger Command-Name' };

  customCommands[key] = {
    name: key,
    response: data.response || '',
    cooldown: data.cooldown || 5,
    enabled: data.enabled !== undefined ? data.enabled : true,
    modOnly: data.modOnly || false,
    createdAt: customCommands[key]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  save();
  return { success: true, command: customCommands[key] };
}

/**
 * Löscht einen Command
 */
function remove(name) {
  const key = name.toLowerCase();
  if (!customCommands[key]) return { success: false, message: 'Command nicht gefunden' };

  delete customCommands[key];
  save();
  return { success: true };
}

/**
 * Schaltet einen Command ein/aus
 */
function toggle(name) {
  const key = name.toLowerCase();
  if (!customCommands[key]) return { success: false, message: 'Command nicht gefunden' };

  customCommands[key].enabled = !customCommands[key].enabled;
  save();
  return { success: true, enabled: customCommands[key].enabled };
}

/**
 * Führt einen Custom Command aus (falls vorhanden)
 * Gibt true zurück wenn ein Command gefunden wurde
 */
function execute(client, channel, tags, commandName, args) {
  const cmd = customCommands[commandName.toLowerCase()];
  if (!cmd || !cmd.enabled) return false;

  // Mod-Only Check
  if (cmd.modOnly) {
    const isMod = tags.mod || tags.badges?.broadcaster === '1';
    if (!isMod) return true; // Command existiert, aber User hat keine Rechte
  }

  // Variablen in der Antwort ersetzen
  let response = cmd.response;
  response = response.replace(/\{user\}/g, tags['display-name']);
  response = response.replace(/\{channel\}/g, channel.replace('#', ''));
  response = response.replace(/\{args\}/g, args.join(' ') || '');
  response = response.replace(/\{count\}/g, getCount(commandName));
  response = response.replace(/\{random (\d+)-(\d+)\}/g, (_, min, max) => {
    return Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
  });
  response = response.replace(/\{pick ([^}]+)\}/g, (_, options) => {
    const choices = options.split('|').map((s) => s.trim());
    return choices[Math.floor(Math.random() * choices.length)];
  });

  client.say(channel, response);
  incrementCount(commandName);
  return true;
}

// Zähler für {count} Variable
const counters = {};
function getCount(name) {
  counters[name] = (counters[name] || 0) + 1;
  return counters[name];
}
function incrementCount(name) {
  // Bereits in getCount erhöht
}

// Beim Start laden
load();

module.exports = { load, getAll, set, remove, toggle, execute };
