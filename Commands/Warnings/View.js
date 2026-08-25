const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy
} = require('../../Utils/Alpha/OffencePolicy');

const ITEMS_PER_PAGE = 10;

module.exports = {
    name: 'view',
    description: 'Shows warning levels for all registered tribes.',
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
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            if (!tribes || tribes.length === 0) {
                return client.responses('Commands.Warnings.NoTribes', interaction);
            }
            const ranked = tribes
                .map((tribe) => ({
                    name: tribe.tribe_name,
                    warningLevel: Number(tribe.warning_level || 0),
                    offenceCount: Number(tribe.offence_count || 0)
                }))
                .sort((a, b) => b.warningLevel - a.warningLevel || b.offenceCount - a.offenceCount || a.name.localeCompare(b.name));
            const warningPolicy = await getWarningPolicy(client, interaction.guild.id);
            return client.pagination.createPagination({
                client,
                items: ranked,
                itemsPerPage: ITEMS_PER_PAGE,
                interaction,
                embedGenerator: (pageItems, currentPage, totalPages) => {
                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                    const description = pageItems.map((tribe, index) => {
                        return `**${startIndex + index + 1}.** ${tribe.name} - Warning: ${tribe.warningLevel}/${warningPolicy.maxWarnings} | Offences: ${tribe.offenceCount}`;
                    }).join('\n');
                    return {
                        color: client.settings.bot.embedColor,
                        title: `${client.user.username} - Tribe Warnings`,
                        description,
                        footer: {
                            text: `${client.footer} | Page ${currentPage}/${totalPages}`
                        }
                    };
                }
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
