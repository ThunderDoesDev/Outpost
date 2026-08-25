const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    sanitizePolicy
} = require('../../Utils/Alpha/OffencePolicy');

module.exports = {
    name: 'add',
    description: 'Add a warning threshold offence count.',
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
        name: 'threshold',
        description: 'Offence count that triggers a warning',
        type: 4,
        required: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const threshold = interaction.options.getInteger('threshold');
            if (!Number.isInteger(threshold) || threshold <= 0) {
                return interaction.reply({
                    content: 'Threshold must be greater than 0.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            const currentPolicy = await getWarningPolicy(client, interaction.guild.id);
            const nextThresholds = [...new Set([...currentPolicy.warningThresholds, threshold])].sort((a, b) => a - b);
            const nextPolicy = sanitizePolicy({
                ...currentPolicy,
                warningThresholds: nextThresholds,
                maxWarnings: Math.max(currentPolicy.maxWarnings, nextThresholds.length)
            });
            await client.database.models.GuildConfig.upsertWarningPolicy(interaction.guild.id, nextPolicy);
            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Warning Threshold Added`)
                    .setDescription(`Added threshold: **${threshold}**`)
                    .addFields({ name: 'Current Thresholds', value: nextPolicy.warningThresholds.join(', ') })
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
