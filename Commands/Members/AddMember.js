const {
    getTribeThread,
    updateTribeThreadEmbed
} = require('../../Utils/Alpha/ThreadUtils');
const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');

module.exports = {
    name: 'add',
    description: 'Adds a tribe member and links their Xbox GT and IGN details.',
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
            name: 'member',
            description: 'Discord user to link',
            type: 6,
            required: true
        },
        {
            name: 'xbox-gt',
            description: 'Xbox gamertag',
            type: 3,
            required: false
        },
        {
            name: 'ign',
            description: 'In-game name',
            type: 3,
            required: false
        }
    ],
    run: async (client, interaction) => {
        try {
            const tribeName = interaction.options.getString('tribe');
            const member = interaction.options.getUser('member');
            const xboxGt = interaction.options.getString('xbox-gt') || null;
            const ign = interaction.options.getString('ign') || null;
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.AddMembers.TribeNotFound', interaction);
            }
            const canManageAllTribes = await hasAlphaAccess(client, interaction);
            const isTribeOwner = String(tribe.owner_id) === String(interaction.user.id);
            if (!canManageAllTribes && !isTribeOwner) {
                return replyNoAlphaAccess(client, interaction);
            }
            const existingMember = await client.database.models.AlphaTribeMember.findOne(
                interaction.guild.id,
                tribe.tribe_name,
                member.id
            );
            if (existingMember) {
                return client.responses('Commands.AddMembers.MemberAlreadyLinked', interaction);
            }
            await client.database.models.AlphaTribeMember.linkIdentity({
                guild_id: interaction.guild.id,
                tribe_name: tribe.tribe_name,
                user_id: member.id,
                xbox_gt: xboxGt || null,
                ign: ign || null,
                role: member.id === tribe.owner_id ? 'owner' : 'member',
                added_by: interaction.user.id
            });
            const threadRecord = await getTribeThread(client, interaction.guild.id, tribe.tribe_name);
            if (threadRecord) {
                try {
                    await updateTribeThreadEmbed(client, interaction, tribe, threadRecord);
                } catch (threadError) {
                    client.errors(client, threadError.stack, interaction, 'Command');
                }
            }
            const successEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Member Added`)
                .setDescription(`<@${member.id}> has been linked to ${tribe.tribe_name}.`)
                .setThumbnail(member.displayAvatarURL({
                    dynamic: true
                }))
                .addFields([{
                    name: 'Xbox GT',
                    value: xboxGt || 'Not set'
                }, {
                    name: 'IGN',
                    value: ign || 'Not set'
                }])
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.reply({
                embeds: [successEmbed]
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
            const canManageAllTribes = await hasAlphaAccess(client, interaction);
            const visibleTribes = canManageAllTribes ?
                tribes :
                tribes.filter((tribe) => String(tribe.owner_id) === String(interaction.user.id));
            if (!visibleTribes.length) {
                return interaction.respond([{
                    name: 'No Tribes Found',
                    value: "no_tribes"
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            let cmdArgument = [];
            if (focusedOption.name === 'tribe') {
                cmdArgument = visibleTribes
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