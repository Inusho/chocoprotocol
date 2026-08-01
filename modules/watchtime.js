// ============================================
// WATCHTIME - Chat-Aktivitäts-Tracking
// ============================================

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'watchtime.json');
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 Minuten ohne Nachricht = Session vorbei
const SAVE_INTERVAL = 5 * 60 * 1000; // Alle 5 Minuten speichern

let data = {};
// { username: { total: ms, lastSeen: timestamp, sessionStart: timestamp } }

let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch {
    data = {};
  }

  // Auto-Save starten
  if (saveTimer) clearInterval(saveTimer);
  saveTimer = setInterval(save, SAVE_INTERVAL);
}

function save() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Nur total speichern, nicht Session-Daten
  const saveData = {};
  for (const [user, info] of Object.entries(data)) {
    saveData[user] = { total: info.total || 0 };
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(saveData, null, 2));
}

/**
 * Wird bei jeder Chat-Nachricht aufgerufen
 */
function trackMessage(username) {
  const now = Date.now();
  const key = username.toLowerCase();

  if (!data[key]) {
    data[key] = { total: 0, lastSeen: now, sessionStart: now };
    return;
  }

  const user = data[key];
  const timeSinceLastMsg = now - (user.lastSeen || 0);

  if (timeSinceLastMsg < SESSION_TIMEOUT) {
    // Session läuft noch – Zeit addieren
    user.total = (user.total || 0) + timeSinceLastMsg;
  } else {
    // Neue Session
    user.sessionStart = now;
  }

  user.lastSeen = now;
}

/**
 * Watchtime eines Users in lesbarem Format
 */
function getWatchtime(username) {
  const key = username.toLowerCase();
  const user = data[key];

  if (!user || !user.total) {
    return { found: false, formatted: '0 Minuten' };
  }

  return { found: true, formatted: formatDuration(user.total) };
}

/**
 * Top-Chatter nach Watchtime
 */
function getTopChatters(count = 5) {
  return Object.entries(data)
    .filter(([, info]) => info.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, count)
    .map(([username, info], index) => ({
      rank: index + 1,
      username,
      total: info.total,
      formatted: formatDuration(info.total),
    }));
}

/**
 * Millisekunden in lesbares Format
 */
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainHours = hours % 24;
    return `${days}d ${remainHours}h`;
  }
  if (hours > 0) {
    const remainMinutes = minutes % 60;
    return `${hours}h ${remainMinutes}m`;
  }
  return `${minutes}m`;
}

// Laden
load();

module.exports = { load, save, trackMessage, getWatchtime, getTopChatters };
