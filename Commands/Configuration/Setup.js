const {
    syncAlphaLeaderboardMessage
} = require('../../Utils/Alpha/Leaderboard');

module.exports = {
    name: 'setup',
    description: 'Sets the alpha system up for the Discord server.',
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
    options: [{
            name: 'forum-channel',
            description: 'Forum channel used for Alpha tribe threads.',
            type: 7,
            required: true
        },
        {
            name: 'logs-channel',
            description: 'Public channel for Alpha activity logs.',
            type: 7,
            required: true
        },
        {
            name: 'announcements-channel',
            description: 'Channel used for Alpha announcements.',
            type: 7,
            required: true
        },
        {
            name: 'leaderboard-channel',
            description: 'Channel used for Alpha leaderboard messages.',
            type: 7,
            required: true
        },
        {
            name: 'alpha-manager-role',
            description: 'Role used for Alpha manager.',
            type: 8,
            required: true
        },
        {
            name: 'admin-logs-channel',
            description: 'Optional. Text channel for staff slash-command audit logs.',
            type: 7,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            const channel = interaction.options.getChannel('forum-channel');
            const publicLogsChannel = interaction.options.getChannel('logs-channel');
            const announcementsChannel = interaction.options.getChannel('announcements-channel');
            const leaderboardChannel = interaction.options.getChannel('leaderboard-channel');
            const alphaManagerRole = interaction.options.getRole('alpha-manager-role');
            const adminLogsChannel = interaction.options.getChannel('admin-logs-channel');
            if (channel.type !== client.modules.discord.ChannelType.GuildForum) {
                return client.responses('Commands.Setup.InvalidForumChannel', interaction);
            }
            if (publicLogsChannel && publicLogsChannel.type !== client.modules.discord.ChannelType.GuildText) {
                return client.responses('Commands.Setup.InvalidLogsChannel', interaction);
            }
            if (announcementsChannel && announcementsChannel.type !== client.modules.discord.ChannelType.GuildText) {
                return client.responses('Commands.Setup.InvalidAnnouncementChannel', interaction);
            }
            if (leaderboardChannel && leaderboardChannel.type !== client.modules.discord.ChannelType.GuildText) {
                return client.responses('Commands.Setup.InvalidLeaderboardChannel', interaction);
            }
            if (!alphaManagerRole || alphaManagerRole.guild.id !== interaction.guild.id) {
                return client.responses('Commands.Setup.InvalidAlphaManagerRole', interaction);
            }
            if (adminLogsChannel && adminLogsChannel.type !== client.modules.discord.ChannelType.GuildText) {
                const embed = new client.modules.discord.EmbedBuilder()
                    .setColor(client.modules.discord.Colors.Red)
                    .setTitle('Invalid channel')
                    .setDescription('Admin command logs must be a standard text channel.')
                    .setFooter({ text: client.footer })
                    .setTimestamp();
                return interaction.reply({
                    embeds: [embed],
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            await client.database.models.GuildConfig.upsertChannels(
                interaction.guild.id,
                channel.id,
                publicLogsChannel.id,
                announcementsChannel.id,
                leaderboardChannel.id,
                alphaManagerRole.id
            );
            if (adminLogsChannel) {
                await client.database.models.GuildConfig.setAdminCommandLogsChannel(
                    interaction.guild.id,
                    adminLogsChannel.id
                );
            }
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const SetupEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle( `${client.user.username} - Setup Completed`)
                .setDescription('The alpha system has been set up for the Discord server.')
                .addFields({
                    name: 'Forum Channel',
                    value: `<#${channel.id}>`
                }, {
                    name: 'Alpha Public Logs Channel:',
                    value: `<#${publicLogsChannel.id}>`
                }, {
                    name: 'Alpha Announcements Channel:',
                    value: `<#${announcementsChannel.id}>`
                }, {
                    name: 'Alpha Leaderboard Channel:',
                    value: `<#${leaderboardChannel.id}>`
                }, {
                    name: 'Alpha Manager Role:',
                    value: `<@&${alphaManagerRole.id}>`
                },
                ...(adminLogsChannel
                    ? [{
                        name: 'Admin command logs:',
                        value: `<#${adminLogsChannel.id}>`
                    }]
                    : []))
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .setFooter({ text: client.footer })
                .setTimestamp();
            return interaction.reply({
                embeds: [SetupEmbed]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};