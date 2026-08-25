const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../Utils/Alpha/Permissions');
const { formatAlphaPoints } = require('../Utils/Alpha/PointsDisplay');

const ITEMS_PER_PAGE = 10;

module.exports = {
    name: 'leaderboard',
    description: 'Shows the Alpha tribe points leaderboard.',
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
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            const ranked = (tribes || [])
                .filter((tribe) => String(tribe.status || '').toLowerCase() !== 'deleted')
                .map((tribe) => ({
                    name: tribe.tribe_name,
                    points: Number(tribe.points || 0)
                }))
                .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
            if (ranked.length === 0) {
                return interaction.reply({
                    content: 'No tribes are registered yet.'
                });
            }
            return client.pagination.createPagination({
                client,
                items: ranked,
                itemsPerPage: ITEMS_PER_PAGE,
                interaction,
                embedGenerator: (pageItems, currentPage, totalPages) => {
                    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                    const description = pageItems.map((tribe, index) => {
                        const rank = startIndex + index + 1;
                        return `**${rank}.** ${tribe.name} - \`${formatAlphaPoints(tribe.points)}\` pts`;
                    }).join('\n');
                    return {
                        color: client.settings.bot.embedColor,
                        title: `${client.user.username} - Alpha Leaderboard`,
                        description,
                        thumbnail: client.user.displayAvatarURL({
                            dynamic: true
                        }),
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