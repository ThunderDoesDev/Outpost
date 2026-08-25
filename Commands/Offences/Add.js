const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    sanitizePolicy
} = require('../../Utils/Alpha/OffencePolicy');

const normalizeReasonKey = (input) => {
    return String(input || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-_]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

module.exports = {
    name: 'add',
    description: 'Add or update an offence type.',
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
        name: 'reason',
        description: 'Reason key (existing or new)',
        type: 3,
        required: true
    }, {
        name: 'label',
        description: 'Display label for this offence',
        type: 3,
        required: true
    }, {
        name: 'deduction',
        description: 'Points deducted for this offence',
        type: 4,
        required: true
    }, {
        name: 'counts-warning',
        description: 'Should this offence increment warning count?',
        type: 5,
        required: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const reason = normalizeReasonKey(interaction.options.getString('reason'));
            const label = interaction.options.getString('label');
            const deduction = interaction.options.getInteger('deduction');
            const countsWarning = interaction.options.getBoolean('counts-warning');

            if (!reason || reason === 'manual-adjustment' || !Number.isInteger(deduction) || deduction <= 0) {
                return interaction.reply({
                    content: 'Use a valid reason and a deduction greater than 0.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }

            const currentPolicy = await getWarningPolicy(client, interaction.guild.id);
            const nextPolicy = sanitizePolicy({
                ...currentPolicy,
                offenceTypes: {
                    ...currentPolicy.offenceTypes,
                    [reason]: {
                        label,
                        deduction,
                        countTowardWarning: countsWarning
                    }
                }
            });

            await client.database.models.GuildConfig.upsertWarningPolicy(interaction.guild.id, nextPolicy);

            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Offence Added`)
                    .setDescription(`Saved offence \`${reason}\`.`)
                    .addFields({
                        name: 'Config',
                        value: `Label: ${label}\nDeduction: ${deduction}\nCounts warning: ${countsWarning ? 'Yes' : 'No'}`
                    })
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
