// ============================================
// TIMER - Wiederkehrende Chat-Nachrichten
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'timers.json');

let timers = [];
let activeIntervals = new Map();
let messageCounter = 0;
let lastMessageCounts = new Map(); // Nachrichten-Zähler pro Timer

function load() {
  try {
    timers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    timers = [];
    save();
  }
  console.log(`⏰ ${timers.length} Timer geladen`);
}

function save() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(timers, null, 2));
}

function getAll() {
  return timers;
}

/**
 * Timer erstellen/aktualisieren
 */
function set(data) {
  const { name, message, interval, minMessages, enabled } = data;
  if (!name || !message || !interval) {
    return { success: false, message: 'Name, Nachricht und Intervall sind Pflicht' };
  }

  const existing = timers.findIndex((t) => t.name === name);
  const timer = {
    name,
    message,
    interval: Math.max(1, parseInt(interval)), // Minuten
    minMessages: parseInt(minMessages) || 0,
    enabled: enabled !== undefined ? enabled : true,
  };

  if (existing >= 0) {
    timers[existing] = timer;
  } else {
    timers.push(timer);
  }

  save();
  return { success: true, timer };
}

/**
 * Timer löschen
 */
function remove(name) {
  const idx = timers.findIndex((t) => t.name === name);
  if (idx < 0) return { success: false, message: 'Timer nicht gefunden' };
  timers.splice(idx, 1);
  save();
  return { success: true };
}

/**
 * Timer ein-/ausschalten
 */
function toggle(name) {
  const timer = timers.find((t) => t.name === name);
  if (!timer) return { success: false, message: 'Timer nicht gefunden' };
  timer.enabled = !timer.enabled;
  save();
  return { success: true, enabled: timer.enabled };
}

/**
 * Chat-Nachricht zählen (wird von bot.js aufgerufen)
 */
function countMessage() {
  messageCounter++;
}

/**
 * Startet alle Timer
 * @param {Function} sendMessage - Callback: (message) => client.say(channel, message)
 */
function startAll(sendMessage) {
  stopAll();

  for (const timer of timers) {
    if (!timer.enabled) continue;

    // Nachrichten-Zähler für diesen Timer initialisieren
    lastMessageCounts.set(timer.name, messageCounter);

    const intervalId = setInterval(() => {
      // Prüfe ob genug Nachrichten seit letztem Mal geschrieben wurden
      const lastCount = lastMessageCounts.get(timer.name) || 0;
      const messagesSince = messageCounter - lastCount;

      if (timer.minMessages > 0 && messagesSince < timer.minMessages) {
        // Nicht genug Chat-Aktivität – überspringen
        return;
      }

      // Nachricht senden
      sendMessage(timer.message);
      lastMessageCounts.set(timer.name, messageCounter);
    }, timer.interval * 60 * 1000);

    activeIntervals.set(timer.name, intervalId);
  }
}

/**
 * Stoppt alle Timer
 */
function stopAll() {
  for (const [, intervalId] of activeIntervals) {
    clearInterval(intervalId);
  }
  activeIntervals.clear();
}

/**
 * Timer neu starten (nach Änderungen)
 */
function restart(sendMessage) {
  startAll(sendMessage);
}

// Laden
load();

module.exports = { load, getAll, set, remove, toggle, countMessage, startAll, stopAll, restart };
