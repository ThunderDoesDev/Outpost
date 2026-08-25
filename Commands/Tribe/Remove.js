const {
    getTribeThread
} = require('../../Utils/Alpha/ThreadUtils');
const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    postAlphaPublicLog
} = require('../../Utils/Alpha/PublicLogs');
const {
    syncAlphaLeaderboardMessage
} = require('../../Utils/Alpha/Leaderboard');

module.exports = {
    name: 'remove',
    description: 'Removes an Alpha tribe from the alpha system.',
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
        }, {
            name: 'reason',
            description: 'Reason for removing the tribe.',
            type: 3,
            required: true,
            choices: [{
                name: 'Wiped',
                value: 'wiped'
            }, {
                name: 'Disqualified',
                value: 'disqualified'       
            }, {
                name: 'Tribe Owner Requested Claim Removal',
                value: 'claim-removal'
            }, {
                name: 'Other',
                value: 'other'
            }]
        },
        {
            name: 'other-reason',
            description: 'Other reason for removing the tribe.',
            type: 3,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            await interaction.deferReply({
                flags: client.modules.discord.MessageFlags.Ephemeral
            });
            const tribeName = interaction.options.getString('tribe');
            const reason = interaction.options.getString('reason');
            const otherReason = interaction.options.getString('other-reason');
            if (reason === 'other' && !String(otherReason || '').trim()) {
                return interaction.editReply({
                    content: 'Please provide `other-reason` when reason is `other`.'
                });
            }
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return interaction.editReply({
                    content: 'Tribe not found.'
                });
            }
            const threadRecord = await getTribeThread(client, interaction.guild.id, tribe.tribe_name);
            if (threadRecord) {
                const thread = await interaction.guild.channels.fetch(threadRecord.thread_id).catch(() => null);
                if (thread) {
                    await thread.delete(`Alpha tribe claim removed by ${interaction.user.tag}`).catch(() => null);
                }
            }
            const removed = await client.database.models.AlphaTribe.removeWithRelations(interaction.guild.id, tribe.id);
            if (!removed) {
                return interaction.editReply({
                    content: 'Failed to remove tribe.'
                });
            }
            const reasonLabel = reason === 'other' ? String(otherReason).trim() : reason;
            await postAlphaPublicLog(client, interaction, {
                title: 'Alpha Tribe Removed',
                tribeName: tribe.tribe_name,
                details: `${tribe.tribe_name} has been removed from the Alpha registry (${reasonLabel}).`
            });
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Removed`)
                .setDescription(`**${tribe.tribe_name}** has been removed from the Alpha registry (${reasonLabel}).`)
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.editReply({
                embeds: [successEmbed],
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (!focusedOption) {
                return interaction.respond([{
                    name: 'No Data',
                    value: "no_data"
                }]);
            }
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            if (!tribes || tribes.length === 0) {
                return interaction.respond([{
                    name: 'No Tribes Found',
                    value: "no_tribes"
                }]);
            }
            let cmdArgument = [];
            if (focusedOption.name === 'tribe') {
                cmdArgument = tribes
                    .filter((tribe) => String(tribe.tribe_name || '').toLowerCase().includes(String(focusedOption.value || '').toLowerCase()))
                    .slice(0, 25)
                    .map((tribe) => {
                        return {
                            name: `${tribe.tribe_name}`,
                            value: tribe.tribe_name
                        };
                    });
            }
            return interaction.respond(cmdArgument.length > 0 ? cmdArgument : [{
                name: 'No Matches Found',
                value: "no_matches"
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};