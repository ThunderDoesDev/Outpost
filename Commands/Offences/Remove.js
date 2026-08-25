const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    sanitizePolicy
} = require('../../Utils/Alpha/OffencePolicy');

module.exports = {
    name: 'remove',
    description: 'Remove an offence type.',
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
        description: 'Offence reason key to remove',
        type: 3,
        required: true,
        autocomplete: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const reason = String(interaction.options.getString('reason') || '').trim().toLowerCase();
            if (!reason || reason === 'manual-adjustment') {
                return interaction.reply({
                    content: 'Choose a valid offence key to remove.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            const currentPolicy = await getWarningPolicy(client, interaction.guild.id);
            if (!currentPolicy.offenceTypes[reason]) {
                return interaction.reply({
                    content: 'That offence key does not exist.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            const nextOffenceTypes = { ...currentPolicy.offenceTypes };
            delete nextOffenceTypes[reason];
            const nextPolicy = sanitizePolicy({
                ...currentPolicy,
                offenceTypes: nextOffenceTypes
            });
            await client.database.models.GuildConfig.upsertWarningPolicy(interaction.guild.id, nextPolicy);
            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Offence Removed`)
                    .setDescription(`Removed offence \`${reason}\`.`)
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focused = String(interaction.options.getFocused() || '').toLowerCase();
            const policy = await getWarningPolicy(client, interaction.guild.id);
            const options = Object.entries(policy.offenceTypes)
                .filter(([key, value]) => key.includes(focused) || String(value.label || '').toLowerCase().includes(focused))
                .slice(0, 25)
                .map(([key, value]) => ({
                    name: `${value.label} (${key})`,
                    value: key
                }));
            return interaction.respond(options.length ? options : [{
                name: 'No offence types found',
                value: 'no_matches'
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
