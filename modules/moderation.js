// ============================================
// MODERATION - Auto-Mod Funktionen
// ============================================

const config = require('../config');

/**
 * Prüft eine Nachricht auf Regelverstöße
 * Gibt null zurück wenn alles ok ist, oder ein Objekt mit Timeout-Info
 */
function check(message, tags) {
  const settings = config.moderation;

  // Prüfe auf gesperrte Wörter
  const bannedWord = checkBannedWords(message, settings.bannedWords);
  if (bannedWord) {
    return {
      duration: settings.timeoutDuration,
      reason: `Gesperrtes Wort: ${bannedWord}`,
      message: '⚠️ Dieses Wort ist hier nicht erlaubt!',
    };
  }

  // Prüfe auf Links
  if (settings.blockLinks) {
    const userType = getUserType(tags);
    if (!settings.linkWhitelist.includes(userType) && containsLink(message)) {
      return {
        duration: settings.timeoutDuration,
        reason: 'Link gepostet',
        message: '⚠️ Links sind hier nicht erlaubt!',
      };
    }
  }

  // Prüfe auf Caps-Spam
  if (message.length >= settings.minCapsLength) {
    const capsPercent = getCapsPercentage(message);
    if (capsPercent > settings.maxCapsPercent) {
      return {
        duration: 5,
        reason: 'Caps-Spam',
        message: '⚠️ Bitte nicht so viele Großbuchstaben!',
      };
    }
  }

  return null; // Alles ok
}

/**
 * Prüft ob ein gesperrtes Wort in der Nachricht vorkommt
 */
function checkBannedWords(message, bannedWords) {
  const lowerMessage = message.toLowerCase();
  for (const word of bannedWords) {
    if (lowerMessage.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/**
 * Prüft ob die Nachricht einen Link enthält
 */
function containsLink(message) {
  const linkPattern = /https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|de|net|org|tv|io|gg|me)/i;
  return linkPattern.test(message);
}

/**
 * Berechnet den Prozentsatz an Großbuchstaben
 */
function getCapsPercentage(message) {
  const letters = message.replace(/[^a-zA-ZäöüÄÖÜ]/g, '');
  if (letters.length === 0) return 0;
  const caps = letters.replace(/[^A-ZÄÖÜ]/g, '').length;
  return (caps / letters.length) * 100;
}

/**
 * Ermittelt den User-Typ aus den Tags
 */
function getUserType(tags) {
  if (tags.badges?.broadcaster === '1') return 'broadcaster';
  if (tags.mod) return 'moderator';
  if (tags.badges?.vip === '1') return 'vip';
  if (tags.subscriber) return 'subscriber';
  return 'viewer';
}

module.exports = { check };
