const { formatAlphaPoints } = require('./PointsDisplay');

const buildTribeThreadEmbed = async (client, guild, tribe) => {
    const memberRows = await client.database.models.AlphaTribe.getMembers(guild.id, tribe.tribe_name);
    let memberMentions = 'None';
    if (memberRows.length > 0) {
        const memberLines = await Promise.all(memberRows.map(async (member) => {
            const guildMember = await guild.members.fetch(member.user_id).catch(() => null);
            const discordName = guildMember?.user?.username || member.user_id;
            const xbox = member.xbox_gt ? ` | Xbox: ${member.xbox_gt}` : '';
            const ign = member.ign ? ` | IGN: ${member.ign}` : '';
            return `• ${discordName}${xbox}${ign}`;
        }));
        memberMentions = memberLines.join('\n');
    }
    const color = client.settings.bot.embedColor;
    const embed = new client.modules.discord.EmbedBuilder()
        .setColor(color)
        .setTitle(`${tribe.tribe_name}`)
        .addFields(
            { name: 'Tribe Owner:', value: `<@${tribe.owner_id}>`, inline: true },
            { name: 'Points:', value: formatAlphaPoints(tribe.points), inline: true },
            { name: 'Map:', value: tribe.map_name || 'Not set', inline: true },
            { name: 'Base Spot:', value: tribe.base_spot || 'Not set', inline: true },
            { name: 'Status:', value: tribe.status || 'Active', inline: true },
            { name: 'Tribe Members:\n', value: memberMentions }
        )
        .setFooter({ text: client.footer })
        .setTimestamp();
    return embed;
};

const getTribeThread = async (client, guildId, tribeName) => {
    return client.database.models.AlphaTribeThread.findOne(guildId, tribeName);
};

const createTribeThread = async (client, interaction, tribe, forumChannel, starterPhotos = []) => {
    const mainEmbed = await buildTribeThreadEmbed(client, interaction.guild, tribe);
    const starterFiles = starterPhotos.map((photo, index) => ({
        attachment: photo.url,
        name: photo.name || `photo-${index + 1}.png`
    }));
    const thread = await forumChannel.threads.create({
        name: (tribe.map_name || tribe.tribe_name).slice(0, 100),
        message: {
            embeds: [mainEmbed],
            files: starterFiles
        },
        reason: `Alpha tribe registered by ${interaction.user.tag}`
    });
    await thread.setLocked(false, `Alpha tribe thread opened (${interaction.user.tag})`).catch(() => null);
    const starterMessage = await thread.fetchStarterMessage();
    await client.database.models.AlphaTribeThread.upsert({
        guild_id: interaction.guild.id,
        tribe_name: tribe.tribe_name,
        forum_channel_id: forumChannel.id,
        thread_id: thread.id,
        main_message_id: starterMessage?.id || null,
        created_by: interaction.user.id
    });
    return { thread, starterMessage, mainEmbed };
};

const updateTribeThreadEmbedForGuild = async (client, guild, tribe, threadRecord) => {
    const thread = await guild.channels.fetch(threadRecord.thread_id).catch(() => null);
    if (!thread || !thread.isThread()) {
        throw new Error('Saved tribe thread was not found.');
    }
    const embed = await buildTribeThreadEmbed(client, guild, tribe);
    const mainMessage = threadRecord.main_message_id
        ? await thread.messages.fetch(threadRecord.main_message_id).catch(() => null)
        : null;
    if (!mainMessage) {
        throw new Error('Main tribe info message was not found.');
    }
    await mainMessage.edit({ embeds: [embed] });
    return { thread, mainMessage, embed };
};

const updateTribeThreadEmbed = async (client, interaction, tribe, threadRecord) => {
    return updateTribeThreadEmbedForGuild(client, interaction.guild, tribe, threadRecord);
};

module.exports = {
    createTribeThread,
    getTribeThread,
    updateTribeThreadEmbed,
    updateTribeThreadEmbedForGuild,
    buildTribeThreadEmbed
};
