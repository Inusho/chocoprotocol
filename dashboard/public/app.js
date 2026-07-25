// Dashboard Frontend
const socket = io();

// DOM Elemente
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const channelName = document.getElementById('channelName');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const eventsLog = document.getElementById('eventsLog');
const statMessages = document.getElementById('statMessages');
const statCommands = document.getElementById('statCommands');
const statTimeouts = document.getElementById('statTimeouts');

// Command Manager Elemente
const btnAddCommand = document.getElementById('btnAddCommand');
const commandForm = document.getElementById('commandForm');
const formTitle = document.getElementById('formTitle');
const cmdName = document.getElementById('cmdName');
const cmdResponse = document.getElementById('cmdResponse');
const cmdCooldown = document.getElementById('cmdCooldown');
const cmdModOnly = document.getElementById('cmdModOnly');
const btnSaveCmd = document.getElementById('btnSaveCmd');
const btnCancelCmd = document.getElementById('btnCancelCmd');
const commandList = document.getElementById('commandList');

// Tabs
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// Initial-Daten empfangen
socket.on('init', (data) => {
  updateStatus(data.connected);
  channelName.textContent = data.channel ? `#${data.channel}` : '';
  updateStats(data.stats);

  // Chat-Verlauf laden
  chatLog.innerHTML = '';
  data.chatLog.forEach((msg) => addChatMessage(msg));

  // Events laden
  if (data.events.length > 0) {
    eventsLog.innerHTML = '';
    data.events.forEach((event) => addEvent(event));
  }

  // Setup-Banner anzeigen wenn nicht konfiguriert
  if (data.configured === false) {
    setupBanner.classList.remove('hidden');
  } else {
    setupBanner.classList.add('hidden');
  }
});

// Live-Updates
socket.on('status', (data) => updateStatus(data.connected));
socket.on('chat', (msg) => addChatMessage(msg));
socket.on('stats', (stats) => updateStats(stats));
socket.on('event', (event) => addEvent(event));

// Status aktualisieren
function updateStatus(connected) {
  statusDot.className = `status-dot ${connected ? 'connected' : ''}`;
  statusText.textContent = connected ? 'Verbunden' : 'Getrennt';
}

// Statistiken aktualisieren
function updateStats(stats) {
  statMessages.textContent = stats.messagesTotal;
  statCommands.textContent = stats.commandsUsed;
  statTimeouts.textContent = stats.timeouts;
}

// Chat-Nachricht hinzufügen
function addChatMessage(msg) {
  const div = document.createElement('div');
  div.className = `chat-message ${msg.isBot ? 'bot-message' : ''}`;

  let badges = '';
  if (msg.badges.broadcaster) badges += '<span class="badge">📺</span>';
  else if (msg.badges.moderator) badges += '<span class="badge">⚔️</span>';
  else if (msg.badges.vip) badges += '<span class="badge">💎</span>';
  else if (msg.badges.subscriber) badges += '<span class="badge">⭐</span>';

  const safeMessage = escapeHtml(msg.message);
  const safeUsername = escapeHtml(msg.username);

  div.innerHTML = `
    <span class="time">${msg.time}</span>
    ${badges}
    <span class="username" style="color: ${msg.color}">${safeUsername}:</span>
    <span class="text">${safeMessage}</span>
  `;

  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Event hinzufügen
function addEvent(event) {
  // "Noch keine Events" entfernen
  const emptyState = eventsLog.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const div = document.createElement('div');
  div.className = `event-item ${event.type}`;

  let text = '';
  switch (event.type) {
    case 'sub':
      text = `🎉 <strong>${escapeHtml(event.username)}</strong> hat gesubbt!`;
      break;
    case 'resub':
      text = `🎉 <strong>${escapeHtml(event.username)}</strong> Resub (${event.months} Monate)`;
      break;
    case 'raid':
      text = `🚨 <strong>${escapeHtml(event.username)}</strong> raidet mit ${event.viewers} Zuschauern!`;
      break;
    case 'giftsub':
      text = `🎁 <strong>${escapeHtml(event.gifter)}</strong> → ${escapeHtml(event.recipient)}`;
      break;
    case 'timeout':
      text = `⚠️ <strong>${escapeHtml(event.username)}</strong> – ${escapeHtml(event.reason)}`;
      break;
    default:
      text = JSON.stringify(event);
  }

  div.innerHTML = `
    <div class="event-time">${event.time}</div>
    <div class="event-text">${text}</div>
  `;

  eventsLog.insertBefore(div, eventsLog.firstChild);
}

// Nachricht senden
function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    socket.emit('sendMessage', message);
    chatInput.value = '';
  }
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// HTML escapen (XSS Schutz)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// COMMAND MANAGER
// ============================================

let editingCommand = null;

// Commands laden
async function loadCommands() {
  try {
    const res = await fetch('/api/commands');
    const data = await res.json();
    renderCommands(data);
  } catch (err) {
    console.error('Commands laden fehlgeschlagen:', err);
  }
}

// Commands rendern
function renderCommands(data) {
  let html = '';

  // Custom Commands
  if (data.custom.length > 0) {
    html += '<h4>Custom Commands</h4>';
    data.custom.forEach((cmd) => {
      html += `
        <div class="command-item ${cmd.enabled ? '' : 'disabled'}">
          <div class="cmd-info">
            <div class="cmd-name">!${escapeHtml(cmd.name)}</div>
            <div class="cmd-desc">${escapeHtml(cmd.response)}</div>
          </div>
          <div class="cmd-actions">
            <button onclick="toggleCommand('${cmd.name}')" title="${cmd.enabled ? 'Deaktivieren' : 'Aktivieren'}">${cmd.enabled ? '⏸️' : '▶️'}</button>
            <button onclick="editCommand('${cmd.name}')" title="Bearbeiten">✏️</button>
            <button class="btn-delete" onclick="deleteCommand('${cmd.name}')" title="Löschen">🗑️</button>
          </div>
        </div>`;
    });
  }

  // Built-In Commands
  html += '<h4>Built-In Commands</h4>';
  data.builtin.forEach((cmd) => {
    const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.map((a) => '!' + a).join(', ')})` : '';
    html += `
      <div class="command-item ${cmd.enabled ? '' : 'disabled'}">
        <div class="cmd-info">
          <div class="cmd-name">!${escapeHtml(cmd.name)}${aliases}</div>
          <div class="cmd-desc">${escapeHtml(cmd.description)}</div>
        </div>
        <div class="cmd-actions">
          <button onclick="toggleBuiltin('${cmd.name}')" title="${cmd.enabled ? 'Deaktivieren' : 'Aktivieren'}">${cmd.enabled ? '⏸️' : '▶️'}</button>
        </div>
      </div>`;
  });

  commandList.innerHTML = html;
}

// Command-Formular anzeigen
btnAddCommand.addEventListener('click', () => {
  editingCommand = null;
  formTitle.textContent = 'Neuer Command';
  cmdName.value = '';
  cmdName.disabled = false;
  cmdResponse.value = '';
  cmdCooldown.value = 5;
  cmdModOnly.checked = false;
  commandForm.classList.remove('hidden');
});

// Formular abbrechen
btnCancelCmd.addEventListener('click', () => {
  commandForm.classList.add('hidden');
  editingCommand = null;
});

// Command speichern
btnSaveCmd.addEventListener('click', async () => {
  const name = editingCommand || cmdName.value.trim();
  const response = cmdResponse.value.trim();

  if (!name || !response) {
    alert('Bitte Name und Antwort ausfüllen!');
    return;
  }

  const method = editingCommand ? 'PUT' : 'POST';
  const url = editingCommand ? `/api/commands/${name}` : '/api/commands';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        response,
        cooldown: parseInt(cmdCooldown.value) || 5,
        modOnly: cmdModOnly.checked,
      }),
    });

    const data = await res.json();
    if (data.success) {
      commandForm.classList.add('hidden');
      editingCommand = null;
      loadCommands();
    } else {
      alert(data.message || data.error || 'Fehler beim Speichern');
    }
  } catch (err) {
    alert('Fehler beim Speichern: ' + err.message);
  }
});

// Command bearbeiten
async function editCommand(name) {
  try {
    const res = await fetch('/api/commands');
    const data = await res.json();
    const cmd = data.custom.find((c) => c.name === name);
    if (!cmd) return;

    editingCommand = name;
    formTitle.textContent = `Command bearbeiten: !${name}`;
    cmdName.value = name;
    cmdName.disabled = true;
    cmdResponse.value = cmd.response;
    cmdCooldown.value = cmd.cooldown;
    cmdModOnly.checked = cmd.modOnly;
    commandForm.classList.remove('hidden');
  } catch (err) {
    console.error(err);
  }
}

// Command löschen
async function deleteCommand(name) {
  if (!confirm(`Command "!${name}" wirklich löschen?`)) return;

  try {
    await fetch(`/api/commands/${name}`, { method: 'DELETE' });
    loadCommands();
  } catch (err) {
    alert('Fehler beim Löschen: ' + err.message);
  }
}

// Command ein-/ausschalten (Custom)
async function toggleCommand(name) {
  try {
    await fetch(`/api/commands/${name}/toggle`, { method: 'PATCH' });
    loadCommands();
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

// Built-In Command ein-/ausschalten
async function toggleBuiltin(name) {
  try {
    await fetch(`/api/commands/${name}/toggle-builtin`, { method: 'PATCH' });
    loadCommands();
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

// Commands initial laden
loadCommands();

// ============================================
// NOTIFICATIONS MANAGER
// ============================================

const notificationsSection = document.getElementById('notificationsSection');

const eventLabels = {
  follow: { icon: '💜', label: 'Follow', vars: '{user}' },
  sub: { icon: '🎉', label: 'Neuer Sub', vars: '{user} {tier}' },
  resub: { icon: '🔄', label: 'Resub', vars: '{user} {months} {tier}' },
  raid: { icon: '🚨', label: 'Raid', vars: '{user} {viewers}' },
  giftsub: { icon: '🎁', label: 'Gift Sub', vars: '{user} {recipient}' },
};

async function loadNotifications() {
  try {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    renderNotifications(data);
  } catch (err) {
    console.error('Notifications laden fehlgeschlagen:', err);
  }
}

function renderNotifications(data) {
  let html = '<div class="notif-list">';

  for (const [type, info] of Object.entries(eventLabels)) {
    const setting = data[type] || { enabled: false, message: '' };
    html += `
      <div class="notif-item ${setting.enabled ? '' : 'disabled'}">
        <div class="notif-header">
          <span class="notif-icon">${info.icon}</span>
          <span class="notif-label">${info.label}</span>
          <button class="notif-toggle" onclick="toggleNotification('${type}', ${!setting.enabled})">${setting.enabled ? '⏸️' : '▶️'}</button>
        </div>
        <div class="notif-body">
          <textarea class="notif-message" id="notif-msg-${type}" rows="2">${escapeHtml(setting.message || '')}</textarea>
          <div class="notif-footer">
            <small class="form-hint">Variablen: ${info.vars}</small>
            <button class="btn-save-notif" onclick="saveNotification('${type}')">Speichern</button>
          </div>
        </div>
      </div>`;
  }

  html += '</div>';
  notificationsSection.innerHTML = html;
}

async function saveNotification(type) {
  const message = document.getElementById(`notif-msg-${type}`).value;
  try {
    const res = await fetch(`/api/notifications/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Gespeichert!');
    }
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

async function toggleNotification(type, enabled) {
  try {
    await fetch(`/api/notifications/${type}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    loadNotifications();
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Notifications laden wenn Tab aktiviert wird
document.querySelector('[data-tab="notifications"]').addEventListener('click', loadNotifications);
loadNotifications();

// ============================================
// SETTINGS MANAGER
// ============================================

const settingsView = document.getElementById('settingsView');
const dashboardView = document.getElementById('dashboardView');
const statsBar = document.getElementById('statsBar');
const btnSettings = document.getElementById('btnSettings');
const btnBackToDashboard = document.getElementById('btnBackToDashboard');
const btnSetup = document.getElementById('btnSetup');
const setupBanner = document.getElementById('setupBanner');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const restartInfo = document.getElementById('restartInfo');
const btnRestart = document.getElementById('btnRestart');

function showSettings() {
  dashboardView.classList.add('hidden');
  statsBar.classList.add('hidden');
  setupBanner.classList.add('hidden');
  settingsView.classList.remove('hidden');
  loadSettingsData();
}

function hideSettings() {
  settingsView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  statsBar.classList.remove('hidden');
  restartInfo.classList.add('hidden');
}

btnSettings.addEventListener('click', showSettings);
btnBackToDashboard.addEventListener('click', hideSettings);
btnSetup.addEventListener('click', showSettings);

// Settings vom Server laden
async function loadSettingsData() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    populateSettings(data.settings);
  } catch (err) {
    console.error('Settings laden fehlgeschlagen:', err);
  }
}

function populateSettings(s) {
  // Twitch
  document.getElementById('setBotUsername').value = s.twitch?.botUsername || '';
  document.getElementById('setOauthToken').value = s.twitch?.oauthToken || '';
  document.getElementById('setChannel').value = s.twitch?.channel || '';
  document.getElementById('setPrefix').value = s.twitch?.prefix || '!';

  // Discord
  document.getElementById('setWebhookUrl').value = s.discord?.webhookUrl || '';
  document.getElementById('setClientId').value = s.discord?.twitchClientId || '';
  document.getElementById('setClientSecret').value = s.discord?.twitchClientSecret || '';
  document.getElementById('setPollInterval').value = (s.discord?.pollInterval || 60000) / 1000;

  // Moderation
  document.getElementById('setBlockLinks').checked = s.moderation?.blockLinks ?? true;
  document.getElementById('setMaxCaps').value = s.moderation?.maxCapsPercent ?? 70;
  document.getElementById('setMinCapsLen').value = s.moderation?.minCapsLength ?? 10;
  document.getElementById('setTimeout').value = s.moderation?.timeoutDuration ?? 10;
  document.getElementById('setBannedWords').value = (s.moderation?.bannedWords || []).join(', ');

  // Soundboard
  document.getElementById('setSoundCooldown').value = s.soundboard?.cooldown ?? 10;
}

// Settings speichern
btnSaveSettings.addEventListener('click', async () => {
  const newSettings = {
    twitch: {
      botUsername: document.getElementById('setBotUsername').value.trim(),
      oauthToken: document.getElementById('setOauthToken').value.trim(),
      channel: document.getElementById('setChannel').value.trim(),
      prefix: document.getElementById('setPrefix').value.trim() || '!',
    },
    discord: {
      webhookUrl: document.getElementById('setWebhookUrl').value.trim(),
      twitchClientId: document.getElementById('setClientId').value.trim(),
      twitchClientSecret: document.getElementById('setClientSecret').value.trim(),
      pollInterval: (parseInt(document.getElementById('setPollInterval').value) || 60) * 1000,
    },
    moderation: {
      blockLinks: document.getElementById('setBlockLinks').checked,
      maxCapsPercent: parseInt(document.getElementById('setMaxCaps').value) || 70,
      minCapsLength: parseInt(document.getElementById('setMinCapsLen').value) || 10,
      timeoutDuration: parseInt(document.getElementById('setTimeout').value) || 10,
      bannedWords: document.getElementById('setBannedWords').value
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean),
      linkWhitelist: ['moderator', 'vip', 'broadcaster'],
    },
    soundboard: {
      soundsFolder: './sounds',
      cooldown: parseInt(document.getElementById('setSoundCooldown').value) || 10,
    },
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Einstellungen gespeichert!');
      if (data.restartRequired) {
        restartInfo.classList.remove('hidden');
      }
    } else {
      alert('Fehler beim Speichern');
    }
  } catch (err) {
    alert('Fehler beim Speichern: ' + err.message);
  }
});

// Bot neustarten
btnRestart.addEventListener('click', async () => {
  btnRestart.disabled = true;
  btnRestart.textContent = 'Startet neu...';
  try {
    await fetch('/api/restart', { method: 'POST' });
  } catch {
    // Verbindung bricht beim Restart ab – ist normal
  }
  showToast('🔄 Bot wird neu gestartet...');
  // Seite nach kurzer Wartezeit neu laden
  setTimeout(() => location.reload(), 3000);
});

// Passwort-Felder ein-/ausblenden
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}
