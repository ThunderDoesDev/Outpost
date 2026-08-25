const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy
} = require('../../Utils/Alpha/OffencePolicy');

module.exports = {
    name: 'all',
    description: 'Show all warning policy settings.',
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
    options: [],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const policy = await getWarningPolicy(client, interaction.guild.id);
            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Warning Policy`)
                    .addFields(
                        { name: 'Max Warnings', value: String(policy.maxWarnings), inline: true },
                        { name: 'Claim Removal At', value: String(policy.claimRemovalOffence), inline: true },
                        { name: 'Thresholds', value: policy.warningThresholds.join(', ') || 'None' }
                    )
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
