const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    getPolicyAction
} = require('../../Utils/Alpha/OffencePolicy');

const describeNextAction = (offenceNumber, policy) => {
    const state = getPolicyAction(offenceNumber, policy);
    if (state.action === 'claim-removed') {
        return 'Claim removed and points reset to 0';
    }
    if (state.action.startsWith('warning-')) {
        return `Warning ${state.warningLevel} triggered`;
    }
    return 'Standard offence penalty only';
};

module.exports = {
    name: 'warnings',
    description: 'Shows warning status for one tribe.',
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
        description: 'Tribe name',
        type: 3,
        required: true,
        autocomplete: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribeName = interaction.options.getString('tribe');
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Tribe.InvalidTribeName', interaction);
            }
            const offenceCount = Number(tribe.offence_count || 0);
            const warningLevel = Number(tribe.warning_level || 0);
            const policy = await getWarningPolicy(client, interaction.guild.id);
            const nextOffenceNumber = offenceCount + 1;
            const crossedThresholds = policy.warningThresholds.filter((t) => offenceCount >= t);
            const nextThreshold = policy.warningThresholds.find((t) => offenceCount < t);
            const thresholdSummary = crossedThresholds.length
                ? `Passed warning thresholds at offence count: ${crossedThresholds.join(', ')}`
                : 'No warning thresholds reached yet.';
            let nextThresholdLine = 'All configured thresholds are already passed.';
            if (policy.warningThresholds.length === 0) {
                nextThresholdLine = 'No offence-count thresholds are configured.';
            } else if (nextThreshold != null) {
                const gap = nextThreshold - offenceCount;
                nextThresholdLine = `Next threshold at offence count **${nextThreshold}** (${gap} more offence${gap === 1 ? '' : 's'}).`;
            }
            const embed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Warnings`)
                .addFields(
                    { name: 'Tribe', value: tribe.tribe_name, inline: true },
                    { name: 'Warning level', value: `${warningLevel} / ${policy.maxWarnings}`, inline: true },
                    { name: 'Offence count', value: String(offenceCount), inline: true },
                    { name: 'Warning thresholds', value: policy.warningThresholds.join(', ') || 'None configured' },
                    { name: 'Progress', value: `${thresholdSummary}\n${nextThresholdLine}` },
                    { name: `If offence #${nextOffenceNumber} is recorded`, value: describeNextAction(nextOffenceNumber, policy) }
                )
                .setFooter({ text: client.footer })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (!focusedOption || focusedOption.name !== 'tribe') {
                return interaction.respond([]);
            }
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            if (!tribes || tribes.length === 0) {
                return interaction.respond([{
                    name: 'No Tribes Found',
                    value: 'no_tribes'
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            const options = tribes
                .filter((t) => String(t.tribe_name || '').toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map((t) => ({
                    name: t.tribe_name,
                    value: t.tribe_name
                }));
            return interaction.respond(options.length ? options : [{
                name: 'No Matches Found',
                value: 'no_matches'
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
