const { isSignificantReason } = require('./ReasonText');
const { formatAlphaPoints, normalizeAlphaPoints } = require('./PointsDisplay');

const formatPoints = (points) => {
    if (points === undefined || points === null) return null;
    const n = normalizeAlphaPoints(Math.abs(points));
    if (!Number.isFinite(n)) return null;
    const absVal = n;
    const text = formatAlphaPoints(absVal);
    return `${text} point${absVal === 1 ? '' : 's'}`;
};

const extractUsernameMentions = (text = '') => {
    const matches = text.match(/(^|\s)@([a-z0-9._-]{2,32})/gi) || [];
    return matches
        .map((match) => match.trim().replace(/^@/, ''))
        .filter(Boolean);
};

const resolveMemberMentions = async (guild, usernames = []) => {
    if (!guild || usernames.length === 0) return [];

    const uniqueUsernames = [...new Set(usernames.map((name) => name.toLowerCase()))];
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return [];

    const resolved = [];
    uniqueUsernames.forEach((username) => {
        const member = members.find((m) => {
            const userName = m.user?.username?.toLowerCase();
            const globalName = m.user?.globalName?.toLowerCase();
            const displayName = m.displayName?.toLowerCase();
            const nickName = m.nickname?.toLowerCase();
            return userName === username || globalName === username || displayName === username || nickName === username;
        });
        if (member) resolved.push(member.id);
    });

    return [...new Set(resolved)];
};

const optionalReasonSuffix = (reason) => {
    if (!isSignificantReason(reason)) return '';
    return ` — ${String(reason).trim()}`;
};

const TYPE_TITLES = {
    'claimed': 'Alpha Tribe Registered',
    'raided-online': 'Alpha Raid — Online',
    'raided-offline': 'Alpha Raid — Offline',
    'won-event': 'Alpha Event Won',
    'daily-claim-reward': 'Daily Claim Reward',
    'other': 'Alpha Points Awarded',
    'tribe-wiped': 'Alpha Tribe Wiped',
    'tribe-disqualified': 'Alpha Tribe Disqualified',
    'claim-removed': 'Alpha Claim Removed',
    'points-added': 'Alpha Points Added',
    'points-removed': 'Alpha Points Removed'
};

const NEGATIVE_LOG_TYPES = new Set([
    'points-removed',
    'tribe-wiped',
    'tribe-disqualified',
    'claim-removed'
]);

const resolveLogTitle = (client, payload = {}) => {
    if (payload.title) return payload.title;
    if (payload.type && TYPE_TITLES[payload.type]) return TYPE_TITLES[payload.type];
    return `${client.user.username} - Alpha Log`;
};

const resolveLogColor = (client, payload = {}) => {
    if (payload.type && NEGATIVE_LOG_TYPES.has(payload.type)) {
        return client.modules.discord.Colors?.Red || '#ED4245';
    }
    if (typeof payload.points === 'number' && payload.points < 0) {
        return client.modules.discord.Colors?.Red || '#ED4245';
    }
    return client.settings.bot.embedColor || '#00FFFF';
};

const buildPublicLogFields = (payload = {}) => {
    const fields = [];
    if (payload.tribeName) {
        fields.push({ name: 'Tribe', value: payload.tribeName, inline: true });
    }
    if (payload.points !== undefined && payload.points !== null) {
        const n = normalizeAlphaPoints(Math.abs(payload.points));
        if (Number.isFinite(n)) {
            const prefix = Number(payload.points) < 0 ? '-' : '+';
            fields.push({
                name: 'Points',
                value: `${prefix}${formatAlphaPoints(n)}`,
                inline: true
            });
        }
    }
    if (payload.totalPoints !== undefined && payload.totalPoints !== null) {
        fields.push({
            name: 'Total',
            value: `${formatAlphaPoints(payload.totalPoints)} pts`,
            inline: true
        });
    }
    const opponent = payload.targetTribeName || payload.defendingTribeName || payload.otherTribeName;
    if (opponent) {
        fields.push({ name: 'Opponent', value: opponent, inline: true });
    }
    if (isSignificantReason(payload.reason)) {
        fields.push({ name: 'Reason', value: String(payload.reason).trim(), inline: false });
    }
    if (payload.warning && String(payload.warning).trim()) {
        fields.push({ name: 'Warning', value: String(payload.warning).trim(), inline: false });
    }
    return fields;
};

const buildPublicLogDescription = (payload = {}) => {
    return payload.details || buildPublicLogMessage(payload) || 'No additional details provided.';
};

const buildPublicLogEmbed = (client, payload = {}) => {
    const description = buildPublicLogDescription(payload);
    const embed = new client.modules.discord.EmbedBuilder()
        .setColor(resolveLogColor(client, payload))
        .setTitle(resolveLogTitle(client, payload))
        .setDescription(description)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: client.footer })
        .setTimestamp();
    const fields = buildPublicLogFields(payload);
    if (fields.length > 0) {
        embed.addFields(...fields);
    }
    return { embed, description };
};

const buildPublicLogMessage = (payload = {}) => {
    const tribeName = payload.tribeName || 'Unknown tribe';
    const targetTribe = payload.targetTribeName || payload.defendingTribeName || payload.otherTribeName || 'another tribe';
    const pointsText = formatPoints(payload.points);
    switch (payload.type) {
        case 'claimed':
            return `${tribeName} has successfully claimed an Alpha base${pointsText ? ` and has been awarded ${pointsText}.` : '.'}`;
        case 'raided-online':
            return `${tribeName} has raided ${targetTribe} while they were online${pointsText ? ` and received ${pointsText}` : ''}${optionalReasonSuffix(payload.reason)}.`;
        case 'raided-offline':
            return `${tribeName} has raided ${targetTribe} while they were offline${pointsText ? ` and received ${pointsText}` : ''}${optionalReasonSuffix(payload.reason)}.`;
        case 'won-event':
            return `${tribeName} has won an admin event${pointsText ? ` and has been awarded ${pointsText}` : ''}${optionalReasonSuffix(payload.reason)}.`;
        case 'daily-claim-reward':
            return `${tribeName} has received the daily claim reward${pointsText ? ` (+${pointsText})` : ''}${optionalReasonSuffix(payload.reason)}.`;
        case 'other':
            return `${tribeName} has received ${pointsText || 'points'} from ${payload.reason ? `${payload.reason}` : ''}.`;
        case 'tribe-wiped':
            return `${tribeName} has been wiped and been removed from the alpha system.`;
        case 'tribe-disqualified':
            return `${tribeName} has been disqualified and been removed from the alpha system.`;
        case 'claim-removed':
            return `${tribeName} has had their claim removed and been removed from the alpha system.`;
        case 'points-added':
            return `${tribeName} has received ${pointsText || 'points'}${payload.otherTribeName ? ` (vs ${payload.otherTribeName})` : ''}.`;
        case 'points-removed':
            return `${tribeName} has lost ${pointsText || 'points'}${payload.reason ? ` for: ${payload.reason}` : ''}${payload.otherTribeName ? ` (vs ${payload.otherTribeName})` : ''}${payload.warning ? ` ${payload.warning}.` : ''}`;
        default:
    }
};

const postAlphaPublicLogToGuild = async (client, guild, payload) => {
    try {
        if (!guild) {
            return null;
        }
        const config = await client.database.models.GuildConfig.findOne(guild.id);
        const publicLogsChannelId = config?.public_logs_channel_id || config?.logs_channel_id || null;
        if (!publicLogsChannelId) {
            const error = new Error(`Alpha public logs channel is not configured for guild: ${guild.id}`);
            client.errors(client, error.stack, guild, 'Event');
            return null;
        }
        const channel = await guild.channels.fetch(publicLogsChannelId).catch(async () => {
            return client.channels.fetch(publicLogsChannelId).catch(() => null);
        });
        if (!channel || !channel.isTextBased()) {
            const error = new Error(`Alpha public logs channel not found or not text based: ${publicLogsChannelId}`);
            client.errors(client, error.stack, guild, 'Event');
            return null;
        }
        if (typeof channel.isSendable === 'function' && !channel.isSendable()) {
            const error = new Error(`Alpha public logs channel is not sendable: ${publicLogsChannelId}`);
            client.errors(client, error.stack, guild, 'Event');
            return null;
        }
        const { embed, description } = buildPublicLogEmbed(client, payload);
        const usernames = extractUsernameMentions(description);
        const mentionIds = await resolveMemberMentions(guild, usernames);
        return await channel.send({
            content: mentionIds.length > 0 ? mentionIds.map((id) => `<@${id}>`).join(' ') : undefined,
            allowedMentions: mentionIds.length > 0 ? { users: mentionIds } : undefined,
            embeds: [embed]
        });
    } catch (error) {
        client.errors(client, error.stack, guild, 'Event');
        return null;
    }
};

const postAlphaPublicLog = async (client, interaction, payload) => {
    if (!interaction?.guild) {
        return null;
    }
    return postAlphaPublicLogToGuild(client, interaction.guild, payload);
};

const SNOWFLAKE_RE = /^\d{17,22}$/;

/**
 * Updates the embed body (and optional @mentions from @username patterns) on an existing
 * Alpha public log message in the configured public logs channel.
 * @returns {{ ok: true, message: import('discord.js').Message } | { ok: false, code: string }}
 */
const editAlphaPublicLogMessage = async (client, interaction, messageId, newDescription) => {
    try {
        if (!interaction?.guild) {
            return { ok: false, code: 'NO_GUILD' };
        }
        const trimmed = typeof newDescription === 'string' ? newDescription.trim() : '';
        if (!trimmed.length || trimmed.length > 4096) {
            return { ok: false, code: 'INVALID_DESCRIPTION' };
        }
        const id = String(messageId).trim();
        if (!SNOWFLAKE_RE.test(id)) {
            return { ok: false, code: 'INVALID_MESSAGE_ID' };
        }
        const config = await client.database.models.GuildConfig.findOne(interaction.guild.id);
        const publicLogsChannelId = config?.public_logs_channel_id || config?.logs_channel_id || null;
        if (!publicLogsChannelId) {
            return { ok: false, code: 'NO_LOG_CHANNEL' };
        }
        const channel = await interaction.guild.channels.fetch(publicLogsChannelId).catch(async () => {
            return client.channels.fetch(publicLogsChannelId).catch(() => null);
        });
        if (!channel || !channel.isTextBased()) {
            return { ok: false, code: 'CHANNEL_UNAVAILABLE' };
        }
        const message = await channel.messages.fetch(id).catch(() => null);
        if (!message) {
            return { ok: false, code: 'MESSAGE_NOT_FOUND' };
        }
        if (!message.embeds?.length) {
            return { ok: false, code: 'NO_EMBED' };
        }
        const usernames = extractUsernameMentions(trimmed);
        const mentionIds = await resolveMemberMentions(interaction.guild, usernames);
        const embed = client.modules.discord.EmbedBuilder.from(message.embeds[0])
            .setDescription(trimmed);
        await message.edit({
            content: mentionIds.length > 0 ? mentionIds.map((uid) => `<@${uid}>`).join(' ') : '',
            embeds: [embed],
            allowedMentions: mentionIds.length > 0 ? { users: mentionIds } : { parse: [] }
        });
        return { ok: true, message };
    } catch (error) {
        client.errors(client, error.stack, interaction, 'Event');
        return { ok: false, code: 'UNKNOWN' };
    }
};

module.exports = {
    postAlphaPublicLog,
    postAlphaPublicLogToGuild,
    editAlphaPublicLogMessage
};