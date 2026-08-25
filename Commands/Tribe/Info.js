const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const { formatAlphaPoints } = require('../../Utils/Alpha/PointsDisplay');

module.exports = {
    name: 'info',
    description: 'Shows information about a specific Alpha tribe.',
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
            name: 'tribe-name',
            description: 'Tribe name',
            type: 3,
            required: true,
            autocomplete: true
        }
    ],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribeName = interaction.options.getString('tribe-name');
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Info.TribeNotFound', interaction);
            }
            const members = await client.database.models.AlphaTribe.getMembers(interaction.guild.id, tribe.tribe_name);
            const photos = await client.database.models.AlphaTribePhoto.findByTribeName(interaction.guild.id, tribe.tribe_name);
            const warningLevel = Number(tribe.warning_level || 0);
            const offenceCount = Number(tribe.offence_count || 0);
            const memberLines = members.slice(0, 20).map((member) => {
                const roleLabel = String(member.role || 'member').toLowerCase() === 'owner' ? 'Owner' : 'Member';
                return `• <@${member.user_id}> (${roleLabel})`;
            });
            const memberValue = memberLines.length
                ? memberLines.join('\n')
                : 'No members linked.';
            const infoEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Info`)
                .addFields(
                    { name: 'Tribe', value: tribe.tribe_name, inline: true },
                    { name: 'Owner', value: `<@${tribe.owner_id}>`, inline: true },
                    { name: 'Points', value: formatAlphaPoints(tribe.points), inline: true },
                    { name: 'Map', value: tribe.map_name || 'Not set', inline: true },
                    { name: 'Base Spot', value: tribe.base_spot || 'Not set', inline: true },
                    { name: 'Status', value: tribe.status || 'active', inline: true },
                    { name: 'Warning Level', value: `${warningLevel}/4`, inline: true },
                    { name: 'Offence Count', value: String(offenceCount), inline: true },
                    { name: `Members (${members.length})`, value: memberValue }
                )
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            const embeds = [infoEmbed];
            if (photos.length > 0) {
                infoEmbed.setImage(photos[0].image_url);
                for (let index = 1; index < photos.length; index += 1) {
                    embeds.push(
                        new client.modules.discord.EmbedBuilder()
                            .setColor(client.settings.bot.embedColor)
                            .setImage(photos[index].image_url)
                    );
                }
            }
            return interaction.reply({
                embeds
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
                    value: "no_maps"
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            let cmdArgument = [];
            if (focusedOption.name === 'tribe-name') {
                cmdArgument = tribes
                    .filter((tribe) => String(tribe.tribe_name || '').toLowerCase().includes(focusedValue))
                    .slice(0, 25)
                    .map((tribe) => ({
                        name: `${tribe.tribe_name}`,
                        value: tribe.tribe_name
                    }));
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