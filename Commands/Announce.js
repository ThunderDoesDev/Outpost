const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../Utils/Alpha/Permissions');

module.exports = {
    name: 'announce',
    description: 'Post an announcement embed to the alpha announcements channel.',
    cooldowns: 3,
    usage: [],
    disabled: false,
    permissions: {
        client: [],
        user: [],
        staff: {
            developers: false
        }
    },
    options: [{
        name: 'content',
        description: 'Body text of the announcement.',
        type: 3,
        required: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            if (!interaction.guild) {
                return client.responses('Commands.Announce.InvalidServer', interaction);
            }
            const guildConfig = await client.database.models.GuildConfig.findOne(interaction.guild.id);
            const channelId = guildConfig?.announcements_channel_id || null;
            if (!channelId) {
                return client.responses('Commands.Announce.InvalidChannel', interaction);
            }
            let channel = client.channels.cache.get(channelId) || null;
            if (!channel) {
                try {
                    channel = await client.channels.fetch(channelId);
                } catch {
                    channel = null;
                }
            }
            if (!channel) {
                return client.responses('Commands.Announce.InvalidChannel', interaction);
            }
            if (channel.guildId !== interaction.guild.id) {
                return client.responses('Commands.Announce.InvalidChannelServer', interaction);
            }
            let content = interaction.options.getString('content', true);
            if (channel.type !== client.modules.discord.ChannelType.GuildText) {
                return client.responses('Commands.Announce.InvalidChannelType', interaction);
            }
            if (content.length > 4096) {
                content = content.slice(0, 4093) + '...';
            }
            const embed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor || '#00FFFF')
                .setTitle('ARK Cluster - Alpha Announcement')
                .setDescription(content)
                .setFooter({
                    text: `Posted by ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({
                        size: 128,
                        dynamic: true
                    })
                })
                .setTimestamp();
            await interaction.deferReply({
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
            try {
                await channel.send({
                    embeds: [embed]
                });
            } catch (sendErr) {
                await client.errors(client, sendErr.stack, interaction, 'Command');
            }
            return interaction.editReply({
                content: 'Announcement posted.'
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};