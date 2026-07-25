// ============================================
// TWITCH API - Stream Status & Helix API
// ============================================

const config = require('../config');

let isLive = false;
let lastStreamData = null;
let pollInterval = null;

/**
 * Holt ein App Access Token von Twitch
 */
async function getAppToken(clientId, clientSecret) {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token-Fehler: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Prüft ob der Kanal gerade live ist
 */
async function checkStream(clientId, accessToken, channelName) {
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channelName)}`,
    {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`API-Fehler: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.data.length > 0 ? data.data[0] : null;
}

/**
 * Startet das Polling für den Stream-Status
 * @param {Object} options
 * @param {string} options.clientId - Twitch Client ID
 * @param {string} options.clientSecret - Twitch Client Secret
 * @param {string} options.channel - Twitch Kanal Name
 * @param {number} options.intervalMs - Poll-Intervall in ms (Standard: 60000)
 * @param {Function} options.onLive - Callback wenn Stream live geht
 * @param {Function} options.onOffline - Callback wenn Stream offline geht
 */
async function startPolling(options) {
  const {
    clientId,
    clientSecret,
    channel,
    intervalMs = 60000,
    onLive,
    onOffline,
  } = options;

  if (!clientId || !clientSecret) {
    console.log('⚠️  Twitch API: Client-ID oder Secret fehlt – Live-Erkennung deaktiviert');
    return;
  }

  let accessToken;

  try {
    accessToken = await getAppToken(clientId, clientSecret);
    console.log('🔑 Twitch API: Token erhalten');
  } catch (err) {
    console.error('❌ Twitch API Token-Fehler:', err.message);
    return;
  }

  async function poll() {
    try {
      const stream = await checkStream(clientId, accessToken, channel);

      if (stream && !isLive) {
        // Stream ist gerade live gegangen
        isLive = true;
        lastStreamData = stream;
        console.log(`🔴 Stream ist LIVE: ${stream.title}`);
        if (onLive) {
          onLive({
            channel,
            title: stream.title,
            game: stream.game_name,
            viewers: stream.viewer_count,
            thumbnail: stream.thumbnail_url
              ?.replace('{width}', '440')
              .replace('{height}', '248'),
            startedAt: stream.started_at,
          });
        }
      } else if (!stream && isLive) {
        // Stream ist offline gegangen
        isLive = false;
        console.log('⚫ Stream ist OFFLINE');
        if (onOffline) {
          onOffline({ channel });
        }
        lastStreamData = null;
      }
    } catch (err) {
      console.error('❌ Stream-Check Fehler:', err.message);
      // Token könnte abgelaufen sein – neuen holen
      if (err.message.includes('401')) {
        try {
          accessToken = await getAppToken(clientId, clientSecret);
          console.log('🔑 Twitch API: Token erneuert');
        } catch (tokenErr) {
          console.error('❌ Token-Erneuerung fehlgeschlagen:', tokenErr.message);
        }
      }
    }
  }

  // Sofort prüfen, dann im Intervall
  await poll();
  pollInterval = setInterval(poll, intervalMs);
  console.log(`📡 Stream-Status Polling aktiv (alle ${intervalMs / 1000}s)`);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function getStatus() {
  return { isLive, stream: lastStreamData };
}

module.exports = {
  startPolling,
  stopPolling,
  getStatus,
};
