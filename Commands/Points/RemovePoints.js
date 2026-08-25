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
const { formatAlphaPoints } = require('../../Utils/Alpha/PointsDisplay');
const { parsePointsAmount, resolveTribeRecord } = require('../../Utils/Alpha/PointsInput');
const { getWarningPolicy } = require('../../Utils/Alpha/OffencePolicy');
const {
    getReasonChoices,
    resolveReasonConfig
} = require('../../Utils/Alpha/OffenceReasons');
const {
    formatPolicyActionLabel,
    buildPolicyResultNotes
} = require('../../Utils/Alpha/PolicyActionDisplay');
const { respondTribeAutocomplete } = require('../../Utils/Alpha/TribeAutocomplete');

module.exports = {
    name: 'remove',
    description: 'Removes points from a tribe.',
    cooldowns: 3,
    usage: ['/points remove <tribe> <reason> <amount>'],
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
            description: 'Tribe name',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'reason',
            description: 'Reason for removing points.',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'amount',
            description: 'Points to remove (applies to every reason, including policy offences).',
            type: 3,
            required: true
        }
    ],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribeName = interaction.options.getString('tribe');
            const reasonKey = interaction.options.getString('reason');
            const amountResult = parsePointsAmount(interaction.options.getString('amount'));
            if (!amountResult.ok) {
                return client.responses('Commands.Points.InvalidPointsAmount', interaction);
            }
            const baseDeduction = amountResult.value;
            const reasonConfig = await resolveReasonConfig(client, interaction.guild.id, reasonKey);
            if (!reasonConfig) {
                return client.responses('Commands.Points.InvalidReason', interaction);
            }
            const tribe = await resolveTribeRecord(client, interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Tribe.InvalidTribeName', interaction);
            }
            await interaction.deferReply({
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
            const warningPolicy = await getWarningPolicy(client, interaction.guild.id);
            let updatedTribe = null;
            let policyResult = null;
            if (reasonConfig.isManual) {
                updatedTribe = await client.database.models.AlphaTribe.removePoints(
                    interaction.guild.id,
                    tribe.id,
                    baseDeduction
                );
            } else {
                policyResult = await client.database.models.AlphaTribe.applyOffencePolicy(
                    interaction.guild.id,
                    tribe.id,
                    baseDeduction,
                    {
                        policy: warningPolicy,
                        countTowardWarning: reasonConfig.countTowardWarning
                    }
                );
                if (!policyResult) {
                    return client.responses('Commands.Tribe.InvalidTribeName', interaction);
                }
                updatedTribe = policyResult.tribe;
            }
            const threadRecord = await getTribeThread(client, interaction.guild.id, tribe.tribe_name);
            if (threadRecord && updatedTribe) {
                try {
                    await updateTribeThreadEmbed(client, interaction, updatedTribe, threadRecord);
                } catch (threadError) {
                    client.errors(client, threadError.stack, interaction, 'Event');
                }
            }
            const totalRemoved = policyResult != null && Number.isFinite(policyResult.totalDeduction)
                ? policyResult.totalDeduction
                : baseDeduction;
            await postAlphaPublicLog(client, interaction, {
                title: 'Alpha Points Removed',
                type: 'points-removed',
                tribeName: tribe.tribe_name,
                reason: reasonConfig.label,
                points: -totalRemoved,
                totalPoints: updatedTribe != null ? updatedTribe.points : (tribe.points ?? 0),
                warning: policyResult ? formatPolicyActionLabel(policyResult.action) : null
            });
            if (policyResult && policyResult.action === 'claim-removed') {
                if (threadRecord) {
                    const thread = await interaction.guild.channels.fetch(threadRecord.thread_id).catch(() => null);
                    if (thread) {
                        await thread.delete(`Alpha claim removed after repeated offences by ${interaction.user.tag}`).catch(() => null);
                    }
                }
                await client.database.models.AlphaTribe.removeWithRelations(interaction.guild.id, tribe.id);
            }
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const policyNotes = buildPolicyResultNotes(
                policyResult,
                reasonConfig.label,
                baseDeduction,
                formatAlphaPoints
            );
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Points Removed`)
                .setDescription(
                    `${tribe.tribe_name} has lost ${formatAlphaPoints(totalRemoved)} points${
                        policyNotes.length ? ` for:\n${policyNotes.join('\n')}` : reasonConfig.isManual ? ` (${reasonConfig.label})` : ''
                    }`
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
            if (focusedOption.name === 'tribe') {
                const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
                return respondTribeAutocomplete(interaction, tribes);
            }
            if (focusedOption.name === 'reason') {
                const choices = await getReasonChoices(client, interaction.guild.id);
                const focusedValue = String(focusedOption.value || '').toLowerCase();
                const options = choices
                    .filter((choice) => (
                        choice.label.toLowerCase().includes(focusedValue)
                        || choice.key.toLowerCase().includes(focusedValue)
                    ))
                    .slice(0, 25)
                    .map((choice) => ({
                        name: choice.label,
                        value: choice.key
                    }));
                return interaction.respond(options.length > 0 ? options : [{
                    name: 'No Matches Found',
                    value: 'no_matches'
                }]);
            }
            return interaction.respond([]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
