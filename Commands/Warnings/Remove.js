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
    description: 'Remove a warning threshold offence count.',
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
        description: 'Threshold to remove',
        type: 4,
        required: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const threshold = interaction.options.getInteger('threshold');
            const currentPolicy = await getWarningPolicy(client, interaction.guild.id);
            const nextThresholds = currentPolicy.warningThresholds.filter((value) => value !== threshold);
            if (nextThresholds.length === currentPolicy.warningThresholds.length) {
                return interaction.reply({
                    content: 'That threshold is not configured.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            const nextPolicy = sanitizePolicy({
                ...currentPolicy,
                warningThresholds: nextThresholds,
                maxWarnings: Math.min(currentPolicy.maxWarnings, Math.max(nextThresholds.length, 1))
            });
            await client.database.models.GuildConfig.upsertWarningPolicy(interaction.guild.id, nextPolicy);
            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Warning Threshold Removed`)
                    .setDescription(`Removed threshold: **${threshold}**`)
                    .addFields({ name: 'Current Thresholds', value: nextPolicy.warningThresholds.join(', ') })
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
