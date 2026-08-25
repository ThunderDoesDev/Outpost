const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    getPolicyAction
} = require('../../Utils/Alpha/OffencePolicy');

module.exports = {
    name: 'offences',
    description: 'Shows offence record for one tribe.',
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
            const nextState = getPolicyAction(nextOffenceNumber, policy);
            let removalLine = '';
            if (offenceCount >= policy.claimRemovalOffence) {
                removalLine = `This tribe is at or past the claim-removal offence count (**${policy.claimRemovalOffence}**).`;
            } else {
                const remaining = policy.claimRemovalOffence - offenceCount;
                removalLine = `**${remaining}** more offence${remaining === 1 ? '' : 's'} until claim removal (at offence #**${policy.claimRemovalOffence}**).`;
            }
            const embed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Offences`)
                .addFields(
                    { name: 'Tribe', value: tribe.tribe_name, inline: true },
                    { name: 'Recorded offences', value: String(offenceCount), inline: true },
                    { name: 'Warning level', value: `${warningLevel} / ${policy.maxWarnings}`, inline: true },
                    { name: 'Toward claim removal', value: removalLine },
                    { name: `Next offence (#${nextOffenceNumber})`, value: nextState.action === 'claim-removed'
                        ? 'Would trigger claim removal.'
                        : nextState.action.startsWith('warning-')
                            ? `Would trigger warning ${nextState.warningLevel}.`
                            : 'Would apply the usual offence penalty only.' }
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
