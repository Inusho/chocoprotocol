// Command: !hallo / !hello
module.exports = {
  name: 'hallo',
  aliases: ['hello', 'hi'],
  description: 'Begrüßt den User',
  cooldown: 5,

  execute(client, channel, tags, args) {
    const greetings = [
      `Hallo @${tags['display-name']}! Willkommen im Stream! 👋`,
      `Hey @${tags['display-name']}! Schön dass du da bist! 🎉`,
      `Moin @${tags['display-name']}! Viel Spaß hier! 😊`,
    ];
    const random = greetings[Math.floor(Math.random() * greetings.length)];
    client.say(channel, random);
  },
};
