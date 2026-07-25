// ============================================
// SOUNDBOARD - Sounds über Browser/OBS abspielen
// ============================================
// Sounds werden per Socket.IO an verbundene Clients
// (Dashboard, OBS Browser-Source) gesendet.

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Cooldown-Tracking
const lastPlayed = new Map();

// Socket.IO Referenz (wird von dashboard/server.js gesetzt)
let io = null;

function setIO(socketIO) {
  io = socketIO;
}

/**
 * Gibt eine Liste aller verfügbaren Sounds zurück
 */
function getSoundList() {
  const soundsDir = config.soundboard.soundsFolder;

  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(soundsDir)
    .filter((file) => /\.(mp3|wav|ogg)$/i.test(file))
    .map((file) => path.basename(file, path.extname(file)));
}

/**
 * Findet die Datei eines Sounds (mit Erweiterung)
 */
function getSoundFile(soundName) {
  const soundsDir = config.soundboard.soundsFolder;
  const extensions = ['.mp3', '.wav', '.ogg'];

  for (const ext of extensions) {
    const filePath = path.join(soundsDir, soundName + ext);
    if (fs.existsSync(filePath)) {
      return soundName + ext;
    }
  }
  return null;
}

/**
 * Spielt einen Sound ab (sendet an alle verbundenen Browser-Clients)
 */
function play(soundName, userId) {
  const cooldown = config.soundboard.cooldown * 1000;

  // Cooldown prüfen
  const now = Date.now();
  if (lastPlayed.has(userId)) {
    const timeSince = now - lastPlayed.get(userId);
    if (timeSince < cooldown) {
      const remaining = Math.ceil((cooldown - timeSince) / 1000);
      return { success: false, message: `⏳ Cooldown! Warte noch ${remaining}s.` };
    }
  }

  // Sound-Datei suchen
  const fileName = getSoundFile(soundName);
  if (!fileName) {
    return { success: false, message: `❌ Sound "${soundName}" nicht gefunden!` };
  }

  // Sound per Socket.IO an alle Clients senden
  if (io) {
    io.emit('playSound', { file: `/sounds/${fileName}`, name: soundName });
  }

  lastPlayed.set(userId, now);
  return { success: true };
}

module.exports = { getSoundList, getSoundFile, play, setIO };
