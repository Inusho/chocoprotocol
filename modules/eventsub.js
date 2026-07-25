// ============================================
// EVENTSUB - Twitch EventSub WebSocket
// ============================================
// Empfängt Echtzeit-Events von Twitch (Follows, etc.)
// Benötigt: User Access Token mit moderator:read:followers Scope
// Der Bot-Account muss Moderator im Kanal sein

const WebSocket = require('ws');

let ws = null;
let sessionId = null;
let reconnectUrl = 'wss://eventsub.wss.twitch.tv/ws';
let keepaliveTimeout = null;
let keepaliveIntervalMs = 30000;
let handlers = {};
let config = {};

/**
 * Startet die EventSub WebSocket-Verbindung
 * @param {Object} opts
 * @param {string} opts.clientId - Twitch Client-ID
 * @param {string} opts.accessToken - User Access Token (oauth: wird entfernt)
 * @param {string} opts.channel - Kanal-Name
 * @param {Function} opts.onFollow - Callback bei Follow
 */
async function connect(opts) {
  config = opts;

  if (!config.clientId || !config.accessToken) {
    console.log('⚠️  EventSub: Client-ID oder Access Token fehlt – Follow-Events deaktiviert');
    return;
  }

  // oauth: Prefix entfernen falls vorhanden
  const token = config.accessToken.replace(/^oauth:/i, '');

  // Erst User-ID des Kanals ermitteln
  try {
    const userId = await getUserId(config.clientId, token, config.channel);
    if (!userId) {
      console.error('❌ EventSub: Kanal nicht gefunden:', config.channel);
      return;
    }
    config.broadcasterId = userId;

    // Bot User-ID ermitteln
    const botId = await getBotUserId(config.clientId, token);
    if (!botId) {
      console.error('❌ EventSub: Bot User-ID konnte nicht ermittelt werden');
      return;
    }
    config.botUserId = botId;
  } catch (err) {
    console.error('❌ EventSub: Fehler beim Ermitteln der User-IDs:', err.message);
    return;
  }

  config.token = token;
  connectWebSocket(reconnectUrl);
}

let authFailed = false;

function connectWebSocket(url) {
  if (authFailed) return;

  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('🔌 EventSub: WebSocket verbunden');
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    handleMessage(msg);
  });

  ws.on('close', (code) => {
    console.log(`⚠️  EventSub: WebSocket geschlossen (Code: ${code})`);
    clearTimeout(keepaliveTimeout);
    // Nicht reconnecten bei Auth-Fehlern oder normalem Close
    if (code === 1000 || code === 4003 || authFailed) return;
    setTimeout(() => connectWebSocket(reconnectUrl), 5000);
  });

  ws.on('error', (err) => {
    console.error('❌ EventSub: WebSocket Fehler:', err.message);
  });
}

function handleMessage(msg) {
  const type = msg.metadata?.message_type;

  switch (type) {
    case 'session_welcome':
      sessionId = msg.payload.session.id;
      keepaliveIntervalMs = (msg.payload.session.keepalive_timeout_seconds || 30) * 1000;
      console.log('✅ EventSub: Session aktiv');
      resetKeepalive();
      // Subscriptions erstellen
      subscribeToEvents();
      break;

    case 'session_keepalive':
      resetKeepalive();
      break;

    case 'notification':
      resetKeepalive();
      handleNotification(msg.payload);
      break;

    case 'session_reconnect':
      reconnectUrl = msg.payload.session.reconnect_url;
      console.log('🔄 EventSub: Reconnect angefordert');
      connectWebSocket(reconnectUrl);
      break;

    case 'revocation':
      console.log('⚠️  EventSub: Subscription widerrufen:', msg.payload.subscription?.type);
      break;
  }
}

function resetKeepalive() {
  clearTimeout(keepaliveTimeout);
  // Wenn kein Keepalive innerhalb des Timeouts + Buffer kommt → reconnect
  keepaliveTimeout = setTimeout(() => {
    console.log('⚠️  EventSub: Keepalive Timeout – reconnecting...');
    if (ws) ws.close();
  }, keepaliveIntervalMs + 10000);
}

function handleNotification(payload) {
  const eventType = payload.subscription?.type;
  const event = payload.event;

  switch (eventType) {
    case 'channel.follow':
      console.log(`💜 Neuer Follow: ${event.user_name}`);
      if (config.onFollow) {
        config.onFollow(event.user_name);
      }
      break;
  }
}

async function subscribeToEvents() {
  // channel.follow (Version 2)
  await createSubscription('channel.follow', '2', {
    broadcaster_user_id: config.broadcasterId,
    moderator_user_id: config.botUserId,
  });
}

async function createSubscription(type, version, condition) {
  try {
    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-ID': config.clientId,
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        version,
        condition,
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`📡 EventSub: ${type} abonniert`);
    } else {
      const errMsg = data.message || data.error || JSON.stringify(data);
      console.error(`❌ EventSub: ${type} Fehler: ${errMsg}`);
      if (data.status === 403 || data.status === 401) {
        console.error('   → Der Bot braucht den Scope "moderator:read:followers"');
        console.error('   → Der Bot-Account muss Moderator im Kanal sein');
        console.error('   → Generiere ein neues OAuth Token mit dem richtigen Scope');
        authFailed = true;
      }
    }
  } catch (err) {
    console.error(`❌ EventSub: Subscription Fehler (${type}):`, err.message);
  }
}

async function getUserId(clientId, token, username) {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
    {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await res.json();
  return data.data?.[0]?.id || null;
}

async function getBotUserId(clientId, token) {
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return data.data?.[0]?.id || null;
}

function disconnect() {
  clearTimeout(keepaliveTimeout);
  if (ws) {
    ws.close(1000);
    ws = null;
  }
}

module.exports = { connect, disconnect };
