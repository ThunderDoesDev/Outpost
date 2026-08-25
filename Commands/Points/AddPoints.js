const {
    getTribeThread,
    updateTribeThreadEmbed
} = require('../../Utils/Alpha/ThreadUtils');
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
const { isSignificantReason } = require('../../Utils/Alpha/ReasonText');
const { formatAlphaPoints } = require('../../Utils/Alpha/PointsDisplay');
const {
    parsePointsAmount,
    resolveTribeRecord,
    resolveOtherTribeName,
    RAID_TYPES
} = require('../../Utils/Alpha/PointsInput');
const { respondTribeAutocomplete } = require('../../Utils/Alpha/TribeAutocomplete');

const ADD_TYPES = new Set(['raided-online', 'raided-offline', 'won-event', 'other']);

module.exports = {
    name: 'add',
    description: 'Adds points to a tribe.',
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
            name: 'tribe',
            description: 'Tribe to add points to',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'type',
            description: 'Type of points to add to the tribe.',
            type: 3,
            required: true,
            choices: [{
                    name: 'Raided Online',
                    value: 'raided-online'
                },
                {
                    name: 'Raided Offline',
                    value: 'raided-offline'
                },
                {
                    name: 'Won Event',
                    value: 'won-event'
                },
                {
                    name: 'Other',
                    value: 'other'
                }
            ]
        },
        {
            name: 'amount',
            description: 'Points to add to the tribe.',
            type: 3,
            required: true
        },
        {
            name: 'other-tribe',
            description: 'Other tribe that was raided (if raided online or offline).',
            type: 3,
            required: false,
            autocomplete: true
        },
        {
            name: 'reason',
            description: 'Reason for the adjustment (only when type is Other).',
            type: 3,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribeName = interaction.options.getString('tribe');
            const type = interaction.options.getString('type');
            const reason = interaction.options.getString('reason');
            const otherTribeRaw = interaction.options.getString('other-tribe');
            if (!ADD_TYPES.has(type)) {
                return client.responses('Commands.Points.Add.InvalidType', interaction);
            }
            const reasonRaw = reason != null ? String(reason).trim() : '';
            if (type === 'other') {
                if (!reasonRaw || !isSignificantReason(reasonRaw)) {
                    return client.responses('Commands.Points.Add.ManualAdjustmentReasonRequired', interaction);
                }
            } else if (reasonRaw && isSignificantReason(reasonRaw)) {
                return client.responses('Commands.Points.Add.ReasonOnlyForOther', interaction);
            }
            const adjustmentReason = type === 'other' ? reasonRaw : '';
            const amountResult = parsePointsAmount(interaction.options.getString('amount'));
            if (!amountResult.ok) {
                return client.responses('Commands.Points.InvalidPointsAmount', interaction);
            }
            const pointsToAdd = amountResult.value;
            const tribe = await resolveTribeRecord(client, interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Tribe.InvalidTribeName', interaction);
            }
            let otherTribeName = null;
            if (RAID_TYPES.has(type)) {
                const otherResult = await resolveOtherTribeName(
                    client,
                    interaction.guild.id,
                    otherTribeRaw,
                    tribe
                );
                if (!otherResult.ok) {
                    if (otherResult.responseKey === 'Commands.Points.InvalidOtherTribe' && !otherTribeRaw) {
                        return client.responses('Commands.Points.OtherTribeRequired', interaction);
                    }
                    return client.responses(otherResult.responseKey, interaction);
                }
                if (!otherResult.name) {
                    return client.responses('Commands.Points.OtherTribeRequired', interaction);
                }
                otherTribeName = otherResult.name;
            } else if (otherTribeRaw) {
                const otherResult = await resolveOtherTribeName(
                    client,
                    interaction.guild.id,
                    otherTribeRaw,
                    tribe
                );
                if (!otherResult.ok) {
                    return client.responses(otherResult.responseKey, interaction);
                }
                otherTribeName = otherResult.name;
            }
            await interaction.deferReply({
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
            const updatedTribe = await client.database.models.AlphaTribe.addPoints(
                interaction.guild.id,
                tribe.id,
                pointsToAdd
            );
            const threadRecord = await getTribeThread(client, interaction.guild.id, tribe.tribe_name);
            if (threadRecord && updatedTribe) {
                try {
                    await updateTribeThreadEmbed(client, interaction, updatedTribe, threadRecord);
                } catch (threadError) {
                    client.errors(client, threadError.stack, interaction, 'Event');
                }
            }
            await postAlphaPublicLog(client, interaction, {
                title: 'Alpha Points Added',
                tribeName: tribe.tribe_name,
                type,
                points: pointsToAdd,
                totalPoints: updatedTribe ? updatedTribe.points : tribe.points,
                otherTribeName: otherTribeName || null,
                reason: adjustmentReason || null
            });
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Points Added`)
                .setDescription(
                    `${tribe.tribe_name} has received ${formatAlphaPoints(pointsToAdd)} points${
                        otherTribeName ? ` (vs ${otherTribeName})` : ''
                    }${type === 'other' ? `. Reason: ${adjustmentReason}` : ''}.`
                )
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
                return interaction.respond([{ name: 'No Data', value: 'no_data' }]);
            }
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            if (focusedOption.name === 'tribe') {
                return respondTribeAutocomplete(interaction, tribes);
            }
            if (focusedOption.name === 'other-tribe') {
                const selectedTribe = interaction.options.getString('tribe');
                return respondTribeAutocomplete(interaction, tribes, { excludeTribeName: selectedTribe });
            }
            return interaction.respond([]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
