module.exports = {
    name: 'disconnect',
    description: 'Disconnects the alpha system from the Discord server.',
    cooldowns: 3,
    usage: [],
    disabled: false,
    permissions: {
        client: [],
        user: ["ManageGuild"],
        staff: {
            developers: false
        }
    },
    run: async (client, interaction) => {
        try {
            await client.database.models.GuildConfig.destroy(
                interaction.guild.id
            );
            const DisconnectEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle( `${client.user.username} - Disconnected`)
                .setDescription('The alpha system has been disconnected from the Discord server.')
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .setFooter({ text: client.footer })
                .setTimestamp();
            return interaction.reply({ embeds: [DisconnectEmbed] });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
};