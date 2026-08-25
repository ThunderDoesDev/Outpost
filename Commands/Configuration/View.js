const { formatDailyRewardStatus } = require('../../Utils/Alpha/DailyRewardScheduler');

module.exports = {
    name: 'view',
    description: 'Views the configuration for the Discord server.',
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
            const guildConfig = await client.database.models.GuildConfig.findOne(
                interaction.guild.id
            );
            if (!guildConfig) {
                return client.responses('Commands.View.NoConfiguration', interaction);
            }
            const ViewEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle( `${client.user.username} - Configuration`)
                .setDescription('Here is the current configuration for the Discord server.')
                .addFields([{
                    name: 'Forum Channel:',
                    value: `<#${guildConfig.tribe_forum_channel_id}>`
                }, {
                    name: 'Public Logs Channel:',
                    value: `<#${guildConfig.public_logs_channel_id}>`
                }, {
                    name: 'Announcements Channel:',
                    value: `<#${guildConfig.announcements_channel_id}>`
                }, {
                    name: 'Leaderboard Channel:',
                    value: `<#${guildConfig.leaderboard_channel_id}>`
                }, {
                    name: 'Alpha Manager Role:',
                    value: `<@&${guildConfig.manager_role_id}>`
                }, {
                    name: 'Admin command logs:',
                    value: guildConfig.admin_command_logs_channel_id
                        ? `<#${guildConfig.admin_command_logs_channel_id}>`
                        : 'Not configured'
                }, {
                    name: 'Automatic daily reward:',
                    value: formatDailyRewardStatus(guildConfig)
                }])
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .setFooter({ text: client.footer })
                .setTimestamp();
            return interaction.reply({ embeds: [ViewEmbed] });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
};