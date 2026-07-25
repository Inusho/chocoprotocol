// ============================================
// SOUNDBOARD - Sounds im Stream abspielen
// ============================================

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Cooldown-Tracking
const lastPlayed = new Map();

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
    .filter((file) => file.endsWith('.mp3') || file.endsWith('.wav'))
    .map((file) => path.basename(file, path.extname(file)));
}

/**
 * Spielt einen Sound ab
 */
function play(soundName, userId) {
  const soundsDir = config.soundboard.soundsFolder;
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
  const extensions = ['.mp3', '.wav'];
  let soundFile = null;

  for (const ext of extensions) {
    const filePath = path.join(soundsDir, soundName + ext);
    if (fs.existsSync(filePath)) {
      soundFile = filePath;
      break;
    }
  }

  if (!soundFile) {
    return { success: false, message: `❌ Sound "${soundName}" nicht gefunden!` };
  }

  // Sound abspielen
  try {
    const playSound = require('play-sound')();
    playSound.play(soundFile, (err) => {
      if (err) console.error('Sound-Fehler:', err);
    });
    lastPlayed.set(userId, now);
    return { success: true };
  } catch (error) {
    console.error('Soundboard Fehler:', error);
    return { success: false, message: '❌ Sound konnte nicht abgespielt werden.' };
  }
}

module.exports = { getSoundList, play };
