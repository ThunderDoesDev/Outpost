const { formatAlphaPoints } = require('./PointsDisplay');

const rankBadge = (rank) => {
    const podium = ['🥇', '🥈', '🥉'];
    if (rank <= podium.length) return podium[rank - 1];
    const keycaps = ['4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    if (rank <= 10) return keycaps[rank - 4];
    return `\`#${rank}\``;
};

const buildAlphaLeaderboardEmbed = async (client, guildId) => {
    const rows = await client.database.models.AlphaTribe.getLeaderboard(guildId);
    const description = rows.length ?
        rows.map((tribe, index) => {
            const rank = index + 1;
            return `${rankBadge(rank)} ${tribe.tribe_name} — \`${formatAlphaPoints(tribe.points)}\` pts`;
        }).join('\n') :
        'No tribes are registered yet.';
    return new client.modules.discord.EmbedBuilder()
        .setColor(client.settings.bot.embedColor)
        .setTitle(`${client.user.username} - Alpha Leaderboard`)
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL({
            dynamic: true
        }))
        .setFooter({
            text: client.footer
        })
        .setTimestamp();
};

const syncAlphaLeaderboardMessage = async (client, guild) => {
    try {
        const config = await client.database.models.GuildConfig.findOne(guild.id);
        if (!config || !config?.leaderboard_channel_id) return null;
        const channel = await guild.channels.fetch(config.leaderboard_channel_id).catch(() => null);
        if (!channel || channel.type !== client.modules.discord.ChannelType.GuildText) return null;
        const embed = await buildAlphaLeaderboardEmbed(client, guild.id, 15);
        let message = null;
        const storedMessageId = config.leaderboard_message_id;
        if (storedMessageId) {
            message = await channel.messages.fetch(storedMessageId).catch(() => null);
        }
        if (message) {
            await message.edit({
                embeds: [embed]
            });
            return message;
        }
        const created = await channel.send({
            embeds: [embed]
        });
        await client.database.models.GuildConfig.setLeaderboardMessage(guild.id, created.id);
        return created;
    } catch (error) {
        client.errors(client, error.stack, guild, 'Event');
        return null;
    }
};

module.exports = {
    buildAlphaLeaderboardEmbed,
    syncAlphaLeaderboardMessage
};