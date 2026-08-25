module.exports.run = async (client, message, args) => {
    try {
        const isBotAuthor = message.author.bot;
        const mentionedBot = message.mentions.users.has(client.user.id);
        if (!isBotAuthor && mentionedBot) {
            const helpEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`Hello there, I'm ${client.user.username}!`)
                .setDescription('Outpost is a high-performance Alpha management system built for serious ARK Cluster tribes.\n\nFor a list of commands, use `/help` to get a list of all commands, or `/help <command>` to get more information about a specific command.')
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return message.reply({
                embeds: [helpEmbed]
            });
        }
    } catch (error) {
        return client.errors(client, error.stack, message, 'Event');
    }
};