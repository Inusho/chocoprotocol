# 🤖 ChocoProtocol

Ein modularer Twitch Chat Bot mit Web-Dashboard, Discord-Integration und Docker-Support.
Komplett über die Web-Oberfläche konfigurierbar – keine Kommandozeile nötig.

![Dashboard](https://img.shields.io/badge/Dashboard-Port%203000-9147ff)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

- **🎮 Chat Commands** – Built-In Commands + eigene über das Dashboard erstellen
- **🛡️ Auto-Moderation** – Links, Caps-Spam und gesperrte Wörter filtern
- **📢 Benachrichtigungen** – Konfigurierbare Texte für Subs, Raids, Gift Subs, Follows
- **💬 Discord-Integration** – Live-Benachrichtigungen, Sub-Alerts und Raid-Meldungen an Discord
- **🔊 Soundboard** – `.mp3`/`.wav` Dateien per Chat-Command abspielen
- **🌐 Web-Dashboard** – Live-Chat, Events, Command-Manager, Einstellungen
- **⚙️ Web-Konfiguration** – Alle Einstellungen direkt im Browser verwalten (kein .env nötig)
- **🐳 Docker-Ready** – Ein Befehl und der Bot läuft

---

## Schnellstart

### Mit Docker (empfohlen)

```bash
git clone https://github.com/NanakiXIIV/chocoprotocol.git
cd chocoprotocol
docker compose up -d
```

Dann im Browser öffnen: **http://localhost:3000**

Beim ersten Start erscheint ein Setup-Banner – einfach Twitch-Daten eingeben, speichern, neustarten. Fertig!

### Ohne Docker

```bash
git clone https://github.com/NanakiXIIV/chocoprotocol.git
cd chocoprotocol
npm install
npm start
```

---

## Einrichtung

### 1. Bot starten

```bash
docker compose up -d
```

### 2. Dashboard öffnen

Öffne `http://localhost:3000` (oder `http://DEINE-IP:3000` von einem anderen PC).

### 3. Einstellungen konfigurieren

Klicke auf **⚙️** oben rechts im Dashboard:

| Einstellung | Beschreibung |
|---|---|
| **Bot-Benutzername** | Der Twitch-Account, unter dem der Bot schreibt |
| **OAuth Token** | Token über [dev.twitch.tv](https://dev.twitch.tv/console) (siehe unten) |
| **Kanal-Name** | Dein Twitch-Kanal (ohne `#`) |

### 4. Speichern & Neustarten

Nach dem Speichern erscheint ein **"Jetzt neustarten"**-Button. Einmal klicken – fertig!

---

## Discord-Integration (optional)

Für automatische Live-Benachrichtigungen und Event-Meldungen an Discord:

1. **Discord Webhook erstellen**: Server-Einstellungen → Integrationen → Webhooks → Neuen Webhook erstellen
2. **Webhook URL** im Dashboard unter ⚙️ → Discord eintragen
3. **Twitch API Credentials** (für Live-Erkennung): Auf [dev.twitch.tv/console](https://dev.twitch.tv/console) eine App erstellen, Client-ID und Secret kopieren

Der Bot sendet dann automatisch:
- 🔴 **Live-Benachrichtigung** mit Embed (Titel, Spiel, Thumbnail)
- 🎉 **Sub/Resub/Gift Sub** Meldungen
- 🚨 **Raid** Alerts

---

## Custom Commands

Eigene Commands direkt im Dashboard erstellen:

1. **⚡ Commands** Tab öffnen
2. **+ Neuer Command** klicken
3. Name und Antwort eingeben

### Verfügbare Variablen

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `{user}` | Username des Aufrufers | `NanakiXIIV` |
| `{channel}` | Kanalname | `meinchannel` |
| `{args}` | Text nach dem Command | `!shoutout cooler_streamer` → `cooler_streamer` |
| `{count}` | Wie oft der Command benutzt wurde | `42` |
| `{random 1-100}` | Zufallszahl im Bereich | `73` |

---

## Built-In Commands

| Command | Aliases | Beschreibung |
|---|---|---|
| `!hallo` | `!hello`, `!hi` | Begrüßung |
| `!dice` | `!würfel`, `!roll` | Würfeln (1-6) |
| `!commands` | `!hilfe`, `!help` | Zeigt alle Commands |
| `!uptime` | – | Stream-Laufzeit |
| `!sound` | – | Sound abspielen |

Alle Commands können im Dashboard ein-/ausgeschaltet werden.

---

## Eigenen Command programmieren

Erstelle eine neue `.js` Datei im `commands/` Ordner:

```js
module.exports = {
  name: 'meincommand',
  aliases: ['mc', 'alias'],
  description: 'Beschreibung für !commands',
  cooldown: 5,
  modOnly: false,
  execute(client, channel, tags, args) {
    client.say(channel, `Hey @${tags['display-name']}! 👋`);
  },
};
```

Beim nächsten Neustart wird der Command automatisch geladen.

---

## Projektstruktur

```
twitch-bot/
├── bot.js                      # Hauptdatei
├── config.js                   # Konfiguration (liest aus settings.json)
├── package.json
├── Dockerfile
├── docker-compose.yml
│
├── commands/                   # Chat-Commands
│   ├── index.js                # Command-System (Autoload, Cooldowns)
│   ├── hallo.js
│   ├── dice.js
│   ├── commands.js
│   ├── uptime.js
│   └── sound.js
│
├── modules/                    # Bot-Module
│   ├── settings.js             # Zentrale Einstellungsverwaltung
│   ├── discord.js              # Discord Webhook Integration
│   ├── twitch-api.js           # Twitch API (Live-Erkennung)
│   ├── moderation.js           # Auto-Mod
│   ├── notifications.js        # Sub/Raid/Follow Alerts
│   ├── custom-commands.js      # Dynamische Commands
│   └── soundboard.js           # Sound-Wiedergabe
│
├── dashboard/                  # Web-Dashboard
│   ├── server.js               # Express + Socket.IO + REST API
│   └── public/
│       ├── index.html
│       ├── style.css
│       └── app.js
│
├── data/                       # Laufzeit-Daten (gitignored)
│   └── settings.json           # Alle Einstellungen
│
└── sounds/                     # Sound-Dateien (.mp3/.wav)
```

---

## Moderation

Die Auto-Moderation ist im Dashboard unter ⚙️ konfigurierbar:

| Regel | Beschreibung | Standard |
|---|---|---|
| **Links blockieren** | Nicht-Mods/VIPs dürfen keine Links posten | ✅ An |
| **Caps-Filter** | Ab X% Großbuchstaben = Timeout | 70% |
| **Gesperrte Wörter** | Frei definierbare Wortliste | – |
| **Timeout-Dauer** | Wie lange der User gemutet wird | 10s |

---

## Umgebungsvariablen (optional)

Statt über das Dashboard kannst du auch eine `.env` Datei verwenden.
Kopiere `.env.example` und fülle die Werte aus:

```bash
cp .env.example .env
```

Die `.env` wird nur beim **allerersten Start** verwendet und dann in `data/settings.json` migriert.
Danach werden alle Änderungen über das Dashboard gemacht.

---

## FAQ

**Wie komme ich von einem anderen PC auf das Dashboard?**
> Öffne `http://IP-DES-SERVERS:3000` im Browser.

**Kann ich den Bot auf einem Raspberry Pi laufen lassen?**
> Ja! Docker installieren, `docker compose up -d`, fertig.

**Wie aktualisiere ich den Bot?**
> ```bash
> git pull
> docker compose up -d --build
> ```
> Deine Einstellungen bleiben erhalten (liegen in `data/`).

**Der Bot verbindet sich nicht mit Twitch**
> Prüfe im Dashboard unter ⚙️ ob Username, OAuth Token und Kanal korrekt sind. Das Token muss mit `oauth:` beginnen.

**Wie bekomme ich ein OAuth Token?**
> 1. Gehe zu [dev.twitch.tv/console](https://dev.twitch.tv/console) und erstelle eine Anwendung (Redirect URL: `http://localhost`, Kategorie: Chat Bot)
> 2. Kopiere die **Client-ID** und öffne diese URL im Browser:
>    ```
>    https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=DEINE_CLIENT_ID&redirect_uri=http://localhost&scope=chat:read+chat:edit+channel:moderate
>    ```
> 3. Nach dem Autorisieren steht der Token in der URL-Leiste (`access_token=...`)
> 4. Im Dashboard eintragen als `oauth:DEIN_TOKEN`

---

## Support

If you find this project useful, you can buy me a coffee!

[!["Buy Me A Coffee"](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/nanaki13)

---

## Lizenz

MIT
