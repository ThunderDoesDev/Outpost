const {
    getTribeThread,
    updateTribeThreadEmbed
} = require('../../Utils/Alpha/ThreadUtils');
const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    syncAlphaLeaderboardMessage
} = require('../../Utils/Alpha/Leaderboard');
const {
    normalizeMapName
} = require('../../Utils/Alpha/MapNames');
const {
    normalizeAlphaPoints,
    pointsValuesEqual,
    formatAlphaPoints
} = require('../../Utils/Alpha/PointsDisplay');

const parsePointsTotal = (raw) => {
    const trimmed = raw != null ? String(raw).trim() : '';
    if (!trimmed) return null;
    const normalized = trimmed.replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;
    return normalizeAlphaPoints(parseFloat(normalized));
};

module.exports = {
    name: 'modify',
    description: "Modify an Alpha tribe's registry data (name, map, base spot, owner, points).",
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
        },
        {
            name: 'new-name',
            description: 'New tribe name',
            type: 3,
            required: false
        },
        {
            name: 'map',
            description: 'Map name',
            type: 3,
            required: false
        },
        {
            name: 'base-spot',
            description: 'Base spot',
            type: 3,
            required: false
        },
        {
            name: 'owner',
            description: 'New tribe owner',
            type: 6,
            required: false
        },
        {
            name: 'points',
            description: 'Set total tribe points',
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
            const newName = interaction.options.getString('new-name');
            const map = interaction.options.getString('map');
            const baseSpot = interaction.options.getString('base-spot');
            const newOwner = interaction.options.getUser('owner');
            const pointsOpt = interaction.options.get('points', false);
            const pointsRaw =
                pointsOpt != null &&
                pointsOpt.value !== undefined &&
                pointsOpt.value !== null
                    ? (typeof pointsOpt.value === 'number'
                        ? String(pointsOpt.value)
                        : String(pointsOpt.value).trim())
                    : null;
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Tribe.Modify.TribeNotFound', interaction);
            }
            const parsedPoints = parsePointsTotal(pointsRaw);
            const pointsProvided = pointsRaw != null && pointsRaw !== '';
            if (pointsProvided && (!Number.isFinite(parsedPoints) || parsedPoints < 0)) {
                return client.responses('Commands.Tribe.Modify.InvalidPoints', interaction);
            }
            const pointsChanging =
                pointsProvided &&
                Number.isFinite(parsedPoints) &&
                !pointsValuesEqual(parsedPoints, tribe.points);
            const hasChange =
                (newName !== null && String(newName).trim() !== '') ||
                (newOwner !== null && newOwner.id !== tribe.owner_id) ||
                (map !== null && map.trim() !== '') ||
                (baseSpot !== null && baseSpot.trim() !== '') ||
                pointsChanging;
            if (!hasChange) {
                if (
                    pointsProvided &&
                    Number.isFinite(parsedPoints) &&
                    pointsValuesEqual(parsedPoints, tribe.points)
                ) {
                    return client.responses('Commands.Tribe.Modify.PointsAlreadyMatch', interaction, {
                        current: formatAlphaPoints(tribe.points)
                    });
                }
                return client.responses('Commands.Tribe.Modify.NoChanges', interaction);
            }
            const trimmedNewName = newName !== null ? String(newName).trim() : '';
            if (trimmedNewName && trimmedNewName.toLowerCase() !== tribe.tribe_name.toLowerCase()) {
                const conflict = await client.database.models.AlphaTribe.findByName(
                    interaction.guild.id,
                    trimmedNewName
                );
                if (conflict && conflict.id !== tribe.id) {
                    return client.responses('Commands.Tribe.Modify.NameAlreadyTaken', interaction);
                }
            }
            if (newOwner && newOwner.id === tribe.owner_id) {
                return client.responses('Commands.Tribe.Modify.SameOwner', interaction);
            }
            const updates = {};
            if (trimmedNewName) updates.tribe_name = trimmedNewName;
            if (map !== null) {
                updates.map_name = normalizeMapName(map);
            }
            if (baseSpot !== null) updates.base_spot = baseSpot.trim() || null;
            if (newOwner) updates.owner_id = newOwner.id;
            if (pointsChanging) updates.points = parsedPoints;
            const updatedTribe = await client.database.models.AlphaTribe.update(
                interaction.guild.id,
                tribe.id,
                updates
            );
            if (!updatedTribe) {
                return client.responses('Commands.Tribe.Modify.UpdateFailed', interaction);
            }
            if (newOwner) {
                const oldOwnerId = tribe.owner_id;
                await client.database.models.AlphaTribeMember.add({
                    guild_id: interaction.guild.id,
                    tribe_name: updatedTribe.tribe_name,
                    user_id: oldOwnerId,
                    role: 'member',
                    added_by: interaction.user.id
                });
                await client.database.models.AlphaTribeMember.add({
                    guild_id: interaction.guild.id,
                    tribe_name: updatedTribe.tribe_name,
                    user_id: newOwner.id,
                    role: 'owner',
                    added_by: interaction.user.id
                });
            }
            const threadRecord = await getTribeThread(client, interaction.guild.id, updatedTribe.tribe_name);
            if (threadRecord) {
                try {
                    if (
                        (updatedTribe.map_name || updatedTribe.tribe_name) !==
                        (tribe.map_name || tribe.tribe_name)
                    ) {
                        const thread = await interaction.guild.channels.fetch(threadRecord.thread_id).catch(() => null);
                        if (thread && thread.isThread()) {
                            await thread.setName((updatedTribe.map_name || updatedTribe.tribe_name).slice(0, 100)).catch(() => null);
                        }
                    }
                    await updateTribeThreadEmbed(client, interaction, updatedTribe, threadRecord);
                } catch (threadError) {
                    client.errors(client, threadError.stack, interaction, 'Command');
                }
            }
            const changeLines = [];
            if (trimmedNewName && trimmedNewName !== tribe.tribe_name) {
                changeLines.push(`Name: **${tribe.tribe_name}** → **${updatedTribe.tribe_name}**`);
            }
            if (map !== null && (tribe.map_name || '') !== (updatedTribe.map_name || '')) {
                changeLines.push(`Map: **${updatedTribe.map_name || '_(cleared)_'}**`);
            }
            if (baseSpot !== null && (tribe.base_spot || '') !== (updatedTribe.base_spot || '')) {
                changeLines.push(`Base spot: **${updatedTribe.base_spot || '_(cleared)_'}**`);
            }
            if (newOwner) {
                changeLines.push(`Owner: <@${tribe.owner_id}> → <@${updatedTribe.owner_id}>`);
            }
            if (pointsChanging) {
                changeLines.push(
                    `Points: **${formatAlphaPoints(tribe.points)}** → **${formatAlphaPoints(updatedTribe.points)}**`
                );
            }
            await syncAlphaLeaderboardMessage(client, interaction.guild);
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Updated`)
                .setDescription(`Tribe updated: ${changeLines.join(' | ') || 'Changes saved.'}`)
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.editReply({
                embeds: [successEmbed],
                flags: client.modules.discord.MessageFlags.Ephemeral
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
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            let cmdArgument = [];
            if (focusedOption.name === 'tribe') {
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