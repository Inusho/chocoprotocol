// ============================================
// COMMAND SYSTEM - Lädt und verwaltet Commands
// ============================================

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Hier werden alle Commands gespeichert
const commands = new Map();

// Cooldowns pro User
const cooldowns = new Map();

// Deaktivierte Built-In Commands
const DISABLED_FILE = path.join(__dirname, '..', 'data', 'disabled-commands.json');
let disabledCommands = {};

function loadDisabled() {
  try {
    disabledCommands = JSON.parse(fs.readFileSync(DISABLED_FILE, 'utf8'));
  } catch {
    disabledCommands = {};
  }
}

function saveDisabled() {
  const dir = path.dirname(DISABLED_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DISABLED_FILE, JSON.stringify(disabledCommands, null, 2));
}

function isDisabled(name) {
  return disabledCommands[name] === false;
}

function toggleBuiltin(name) {
  // Prüfe ob der Command existiert
  if (!commands.has(name)) return { success: false, message: 'Command nicht gefunden' };
  if (disabledCommands[name] === false) {
    delete disabledCommands[name];
  } else {
    disabledCommands[name] = false;
  }
  saveDisabled();
  return { success: true, enabled: !isDisabled(name) };
}

function getDisabled() {
  return disabledCommands;
}

/**
 * Lädt alle Command-Dateien aus dem commands/ Ordner
 */
function loadCommands() {
  const commandFiles = fs.readdirSync(__dirname).filter(
    (file) => file !== 'index.js' && file.endsWith('.js')
  );

  for (const file of commandFiles) {
    const command = require(path.join(__dirname, file));
    commands.set(command.name, command);

    // Aliases registrieren
    if (command.aliases) {
      for (const alias of command.aliases) {
        commands.set(alias, command);
      }
    }
  }

  console.log(`📋 ${commandFiles.length} Commands geladen`);
  loadDisabled();
}

/**
 * Verarbeitet einen Command aus dem Chat
 */
function handleCommand(client, channel, tags, message) {
  // Command und Argumente extrahieren
  const args = message.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  // Command suchen
  const command = commands.get(commandName);
  if (!command) return;

  // Prüfe ob Command deaktiviert ist
  if (isDisabled(command.name)) return;

  // Berechtigungen prüfen
  if (command.modOnly) {
    const isMod = tags.mod || tags.badges?.broadcaster === '1';
    if (!isMod) return;
  }

  if (command.broadcasterOnly) {
    if (tags.badges?.broadcaster !== '1') return;
  }

  // Cooldown prüfen
  const cooldownKey = `${tags['user-id']}-${command.name}`;
  const cooldownTime = (command.cooldown || 3) * 1000;
  const now = Date.now();

  if (cooldowns.has(cooldownKey)) {
    const expiration = cooldowns.get(cooldownKey) + cooldownTime;
    if (now < expiration) return; // Noch im Cooldown
  }
  cooldowns.set(cooldownKey, now);

  // Command ausführen
  try {
    command.execute(client, channel, tags, args);
  } catch (error) {
    console.error(`❌ Fehler bei Command "${commandName}":`, error);
    client.say(channel, `@${tags['display-name']} Da ist leider ein Fehler aufgetreten!`);
  }
}

module.exports = { loadCommands, handleCommand, commands, toggleBuiltin, isDisabled, getDisabled };
