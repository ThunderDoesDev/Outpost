const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy
} = require('../../Utils/Alpha/OffencePolicy');

module.exports = {
    name: 'all',
    description: 'List all configured offence types.',
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
            const offenceRows = Object.entries(policy.offenceTypes).map(([key, value]) => {
                return `\`${key}\` - ${value.label} | -${value.deduction} | ${value.countTowardWarning ? 'Counts warning' : 'No warning count'}`;
            });
            if (!offenceRows.length) {
                return interaction.reply({
                    content: 'No offence types configured.',
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
            return interaction.reply({
                embeds: [new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - All Offence Types`)
                    .setDescription(offenceRows.join('\n').slice(0, 4000))
                    .setFooter({ text: client.footer })
                    .setTimestamp()]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
