const { getLocalParts } = require('./DailyRewardTime');
const { postAlphaPublicLogToGuild } = require('./PublicLogs');
const { syncAlphaLeaderboardMessage } = require('./Leaderboard');
const {
    getTribeThread,
    updateTribeThreadEmbedForGuild
} = require('./ThreadUtils');
const { DAILY_REWARD_DEFAULT_AMOUNT } = require('./PointDefaults');
const { formatAlphaPoints } = require('./PointsDisplay');

const formatDailyRewardStatus = (guildConfig) => {
    if (!guildConfig?.daily_reward_enabled || !guildConfig.daily_reward_time) {
        return 'Disabled';
    }
    const amount = guildConfig.daily_reward_amount || DAILY_REWARD_DEFAULT_AMOUNT;
    const timezone = guildConfig.daily_reward_timezone || 'UTC';
    return `Enabled — ${guildConfig.daily_reward_time} (${timezone}), ${formatAlphaPoints(amount)} points per active tribe`;
};

const getCheckIntervalMs = (client) => {
    const configured = Number(client?.settings?.dailyReward?.checkIntervalMs);
    return Number.isFinite(configured) && configured >= 15000 ? configured : 60000;
};

const shouldRunGuildDailyReward = (guildConfig, now = new Date()) => {
    if (!guildConfig?.daily_reward_enabled || !guildConfig.daily_reward_time) {
        return false;
    }
    const timeZone = guildConfig.daily_reward_timezone || 'UTC';
    const [targetHour, targetMinute] = String(guildConfig.daily_reward_time).split(':').map(Number);
    if (!Number.isInteger(targetHour) || !Number.isInteger(targetMinute)) {
        return false;
    }
    const local = getLocalParts(now, timeZone);
    if (local.hour !== targetHour || local.minute !== targetMinute) {
        return false;
    }
    if (guildConfig.last_daily_reward_run_key === local.dateKey) {
        return false;
    }
    return true;
};

const processGuildDailyRewards = async (client, guildConfig) => {
    const guild = await client.guilds.fetch(guildConfig.guild_id).catch(() => null);
    if (!guild) return { granted: 0, skipped: 0 };

    const timeZone = guildConfig.daily_reward_timezone || 'UTC';
    const rewardAmount = Number.isInteger(guildConfig.daily_reward_amount) && guildConfig.daily_reward_amount > 0
        ? guildConfig.daily_reward_amount
        : DAILY_REWARD_DEFAULT_AMOUNT;

    const tribes = await client.database.models.AlphaTribe.findAll(guild.id);
    const activeTribes = tribes.filter((tribe) => String(tribe.status || '').toLowerCase() !== 'deleted');

    let granted = 0;
    let skipped = 0;

    for (const tribe of activeTribes) {
        const result = await client.database.models.AlphaTribe.claimDailyReward(
            guild.id,
            tribe.id,
            rewardAmount,
            { timeZone }
        );
        if (!result) {
            skipped += 1;
            continue;
        }
        if (!result.success) {
            skipped += 1;
            continue;
        }
        granted += 1;
        const updatedTribe = result.tribe;
        const threadRecord = await getTribeThread(client, guild.id, tribe.tribe_name);
        if (threadRecord && updatedTribe) {
            try {
                await updateTribeThreadEmbedForGuild(client, guild, updatedTribe, threadRecord);
            } catch (threadError) {
                client.errors(client, threadError.stack, guild, 'Event');
            }
        }
        await postAlphaPublicLogToGuild(client, guild, {
            tribeName: tribe.tribe_name,
            type: 'daily-claim-reward',
            points: rewardAmount,
            totalPoints: updatedTribe?.points,
            reason: 'Automatic daily reward'
        });
    }

    const local = getLocalParts(new Date(), timeZone);
    await client.database.models.GuildConfig.markDailyRewardRun(guild.id, local.dateKey);

    if (granted > 0) {
        await syncAlphaLeaderboardMessage(client, guild);
    }

    if (granted > 0 || activeTribes.length > 0) {
        client.logger.log(
            'DAILY_REWARD',
            `${guild.name} (${guild.id}): granted ${granted}, skipped ${skipped}`
        );
    }

    return { granted, skipped };
};

const runDailyRewardTick = async (client) => {
    const guildConfigs = await client.database.models.GuildConfig.findAllWithDailyRewardEnabled();
    const now = new Date();
    for (const guildConfig of guildConfigs) {
        if (!shouldRunGuildDailyReward(guildConfig, now)) continue;
        try {
            await processGuildDailyRewards(client, guildConfig);
        } catch (error) {
            client.errors(client, error.stack, null, 'Event');
        }
    }
};

const startDailyRewardScheduler = (client) => {
    const intervalMs = getCheckIntervalMs(client);
    runDailyRewardTick(client).catch((error) => {
        client.errors(client, error.stack, null, 'Event');
    });
    return setInterval(() => {
        runDailyRewardTick(client).catch((error) => {
            client.errors(client, error.stack, null, 'Event');
        });
    }, intervalMs);
};

module.exports = {
    startDailyRewardScheduler,
    shouldRunGuildDailyReward,
    processGuildDailyRewards,
    runDailyRewardTick,
    formatDailyRewardStatus
};
