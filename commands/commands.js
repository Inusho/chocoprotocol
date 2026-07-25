// Command: !commands / !hilfe
const { commands, isDisabled } = require('./index');
const customCommands = require('../modules/custom-commands');

module.exports = {
  name: 'commands',
  aliases: ['hilfe', 'help'],
  description: 'Zeigt alle verfügbaren Commands',
  cooldown: 10,

  execute(client, channel, tags, args) {
    const prefix = require('../config').prefix;

    // Built-In Commands (ohne Aliases, nur aktive)
    const uniqueCommands = [...new Set(commands.values())];
    const builtIn = uniqueCommands
      .filter((cmd) => !isDisabled(cmd.name))
      .map((cmd) => `${prefix}${cmd.name}`);

    // Custom Commands (nur aktive)
    const custom = Object.values(customCommands.getAll())
      .filter((cmd) => cmd.enabled)
      .map((cmd) => `${prefix}${cmd.name}`);

    const all = [...builtIn, ...custom].join(', ');
    client.say(channel, `📋 Verfügbare Commands: ${all}`);
  },
};
