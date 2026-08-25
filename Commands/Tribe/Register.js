const {
    createTribeThread
} = require('../../Utils/Alpha/ThreadUtils');
const {
    isImageAttachment,
    saveStarterThreadPhotos
} = require('../../Utils/Alpha/PhotoUtils');
const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    postAlphaPublicLog
} = require('../../Utils/Alpha/PublicLogs');
const {
    syncAlphaLeaderboardMessage
} = require('../../Utils/Alpha/Leaderboard');
const {
    MAP_AUTOCOMPLETE_CHOICES,
    normalizeMapName
} = require('../../Utils/Alpha/MapNames');
const { TRIBE_REGISTRATION_START_POINTS } = require('../../Utils/Alpha/PointDefaults');

module.exports = {
    name: 'register',
    description: 'Registers a new Alpha tribe.',
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
            name: 'tribe-name',
            description: 'Tribe name',
            type: 3,
            required: true
        },
        {
            name: 'owner',
            description: 'Tribe owner',
            type: 6,
            required: true
        },
        {
            name: 'map',
            description: 'Map name',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'base-spot',
            description: 'Base spot',
            type: 3,
            required: true
        },
        {
            name: 'photo-1',
            description: 'Base photo 1',
            type: 11,
            required: true
        },
        {
            name: 'photo-2',
            description: 'Base photo 2',
            type: 11,
            required: true
        },
        {
            name: 'photo-3',
            description: 'Base photo 3',
            type: 11,
            required: true
        },
        {
            name: 'photo-4',
            description: 'Base photo 4',
            type: 11,
            required: true
        }
    ],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            await interaction.deferReply({
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
            const tribeName = interaction.options.getString('tribe-name');
            const owner = interaction.options.getUser('owner');
            const map = normalizeMapName(interaction.options.getString('map'));
            if (!map) {
                return interaction.editReply({
                    content: 'Choose a valid map from the autocomplete list.'
                });
            }
            const baseSpot = interaction.options.getString('base-spot');
            const config = await client.database.models.GuildConfig.findOne(interaction.guild.id);
            if (!config || !config?.tribe_forum_channel_id) {
                return client.responses('Commands.Setup.InvalidForumChannel', interaction);
            }
            const forumChannel = await interaction.guild.channels.fetch(config.tribe_forum_channel_id).catch(() => null);
            if (!forumChannel || forumChannel.type !== client.modules.discord.ChannelType.GuildForum) {
                return client.responses('Commands.Setup.InvalidForumChannel', interaction);
            }
            const existing = await client.database.models.AlphaTribe.findByName(interaction.guild.id, tribeName);
            if (existing) {
                return client.responses('Commands.Tribe.Register.TribeAlreadyExists', interaction);
            }
            const attachments = ['photo-1', 'photo-2', 'photo-3', 'photo-4'].map((key) => interaction.options.getAttachment(key)).filter(Boolean);
            for (const attachment of attachments) {
                if (!isImageAttachment(attachment)) {
                    return client.responses('Commands.Setup.InvalidPhotoChannel', interaction);
                }
            }
            const initialPoints = TRIBE_REGISTRATION_START_POINTS;
            const tribe = await client.database.models.AlphaTribe.create({
                guild_id: interaction.guild.id,
                tribe_name: tribeName,
                owner_id: owner.id,
                map_name: map,
                base_spot: baseSpot,
                points: initialPoints,
                status: 'Active',
                created_by: interaction.user.id
            });
            await client.database.models.AlphaTribeMember.add({
                guild_id: interaction.guild.id,
                tribe_name: tribe.tribe_name,
                user_id: owner.id,
                role: 'owner',
                added_by: interaction.user.id
            });
            const photoPayload = attachments.map((attachment) => ({
                url: attachment.url,
                name: attachment.name
            }));
            const {
                thread,
                starterMessage
            } = await createTribeThread(client, interaction, tribe, forumChannel, photoPayload);
            await saveStarterThreadPhotos(
                client,
                interaction,
                tribe,
                thread,
                starterMessage,
                photoPayload
            );
            await postAlphaPublicLog(client, interaction, {
                type: 'claimed',
                title: 'Alpha Tribe Registered',
                tribeName: tribe.tribe_name,
                points: initialPoints,
                details: `${tribe.tribe_name} has been registered with <@${owner.id}> as owner on ${map}${baseSpot ? ` (${baseSpot})` : ''} and started with ${initialPoints} points.`
            });
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Registered`)
                .setDescription(`${tribe.tribe_name} has been registered in the Alpha registry.`)
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.editReply({
                embeds: [successEmbed],
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (!focusedOption) {
                return interaction.respond([{
                    name: 'No Data',
                    value: "no_data"
                }]);
            }
            const maps = MAP_AUTOCOMPLETE_CHOICES;
            if (!maps || maps.length === 0) {
                return interaction.respond([{
                    name: 'No Maps Found',
                    value: "no_maps"
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            let cmdArgument = [];
            if (focusedOption.name === 'map') {
                cmdArgument = maps
                    .filter((map) => String(map || '').toLowerCase().includes(focusedValue))
                    .slice(0, 25)
                    .map((map) => ({
                        name: `${map}`,
                        value: map
                    }));
            }
            return interaction.respond(cmdArgument.length > 0 ? cmdArgument : [{
                name: 'No Matches Found',
                value: "no_matches"
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};