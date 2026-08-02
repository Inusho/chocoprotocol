// ============================================
// SHOUTOUT-LISTE - Auto-Shoutout für Streamer-Freunde
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'shoutout-list.json');

let streamers = [];
let seenThisSession = new Set(); // Wer hat schon einen SO bekommen in dieser Session

function load() {
  try {
    streamers = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    streamers = [];
    save();
  }
  console.log(`📢 ${streamers.length} Streamer in Auto-Shoutout Liste`);
}

function save() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(streamers, null, 2));
}

function getAll() {
  return streamers;
}

/**
 * Streamer zur Liste hinzufügen
 */
function add(username) {
  const name = username.toLowerCase().replace('@', '').trim();
  if (!name) return { success: false, message: 'Kein Name angegeben' };
  if (streamers.includes(name)) return { success: false, message: 'Ist bereits in der Liste' };

  streamers.push(name);
  save();
  return { success: true, username: name };
}

/**
 * Streamer aus der Liste entfernen
 */
function remove(username) {
  const name = username.toLowerCase().replace('@', '').trim();
  const idx = streamers.indexOf(name);
  if (idx < 0) return { success: false, message: 'Nicht in der Liste' };

  streamers.splice(idx, 1);
  save();
  return { success: true };
}

/**
 * Prüft ob ein User in der Liste ist und noch keinen SO bekommen hat
 * Gibt den Username zurück wenn ein SO fällig ist, sonst null
 */
function checkMessage(username) {
  const name = username.toLowerCase();
  if (!streamers.includes(name)) return null;
  if (seenThisSession.has(name)) return null;

  // Ersten SO für diese Session markieren
  seenThisSession.add(name);
  return name;
}

/**
 * Session zurücksetzen (bei Bot-Neustart passiert das automatisch)
 */
function resetSession() {
  seenThisSession.clear();
}

// Laden
load();

module.exports = { load, getAll, add, remove, checkMessage, resetSession };
