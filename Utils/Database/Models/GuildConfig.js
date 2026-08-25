module.exports = (db) => ({
    async findOne(guild_id) {
        const [rows] = await db.query(
            'SELECT * FROM guild_configs WHERE guild_id = ? LIMIT 1',
            [guild_id]
        );
        return rows[0] || null;
    },
    async upsertForumChannel(guild_id, tribe_forum_channel_id) {
        await db.query(
            `INSERT INTO guild_configs (guild_id, tribe_forum_channel_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE tribe_forum_channel_id = VALUES(tribe_forum_channel_id)`,
            [guild_id, tribe_forum_channel_id]
        );
        return this.findOne(guild_id);
    },
    async upsertChannels(
        guild_id,
        tribe_forum_channel_id,
        public_logs_channel_id,
        announcements_channel_id,
        leaderboard_channel_id,
        manager_role_id
    ) {
        await db.query(
            `INSERT INTO guild_configs (
                guild_id,
                tribe_forum_channel_id,
                public_logs_channel_id,
                announcements_channel_id,
                leaderboard_channel_id,
                manager_role_id
            ) VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                tribe_forum_channel_id = VALUES(tribe_forum_channel_id),
                public_logs_channel_id = VALUES(public_logs_channel_id),
                announcements_channel_id = VALUES(announcements_channel_id),
                leaderboard_channel_id = VALUES(leaderboard_channel_id),
                manager_role_id = VALUES(manager_role_id)`,
            [
                guild_id,
                tribe_forum_channel_id || null,
                public_logs_channel_id || null,
                announcements_channel_id || null,
                leaderboard_channel_id || null,
                manager_role_id || null
            ]
        );
        return this.findOne(guild_id);
    },
    async setLeaderboardMessage(guild_id, messageId) {
        await db.query(
            `INSERT INTO guild_configs (guild_id, leaderboard_message_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE leaderboard_message_id = VALUES(leaderboard_message_id)`,
            [guild_id, messageId || null]
        );
        return this.findOne(guild_id);
    },
    async getWarningPolicy(guild_id) {
        const row = await this.findOne(guild_id);
        if (!row || !row.warning_policy) return null;
        try {
            if (typeof row.warning_policy === 'string') {
                return JSON.parse(row.warning_policy);
            }
            return row.warning_policy;
        } catch (error) {
            return null;
        }
    },
    async upsertWarningPolicy(guild_id, warningPolicyObject) {
        await db.query(
            `INSERT INTO guild_configs (guild_id, warning_policy)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE warning_policy = VALUES(warning_policy)`,
            [guild_id, JSON.stringify(warningPolicyObject || null)]
        );
        return this.findOne(guild_id);
    },
    async setAdminCommandLogsChannel(guild_id, admin_command_logs_channel_id) {
        await db.query(
            `INSERT INTO guild_configs (guild_id, admin_command_logs_channel_id)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE admin_command_logs_channel_id = VALUES(admin_command_logs_channel_id)`,
            [guild_id, admin_command_logs_channel_id || null]
        );
        return this.findOne(guild_id);
    },
    async findAllWithDailyRewardEnabled() {
        const [rows] = await db.query(
            `SELECT *
             FROM guild_configs
             WHERE daily_reward_enabled = 1
               AND daily_reward_time IS NOT NULL`
        );
        return rows;
    },
    async upsertDailyReward(guild_id, { time, timezone, amount, enabled }) {
        await db.query(
            `INSERT INTO guild_configs (
                guild_id,
                daily_reward_enabled,
                daily_reward_time,
                daily_reward_timezone,
                daily_reward_amount
            ) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                daily_reward_enabled = VALUES(daily_reward_enabled),
                daily_reward_time = VALUES(daily_reward_time),
                daily_reward_timezone = VALUES(daily_reward_timezone),
                daily_reward_amount = VALUES(daily_reward_amount),
                last_daily_reward_run_key = NULL`,
            [
                guild_id,
                enabled ? 1 : 0,
                time || null,
                timezone || 'UTC',
                amount
            ]
        );
        return this.findOne(guild_id);
    },
    async disableDailyReward(guild_id) {
        await db.query(
            `UPDATE guild_configs
             SET daily_reward_enabled = 0,
                 daily_reward_time = NULL,
                 last_daily_reward_run_key = NULL
             WHERE guild_id = ?`,
            [guild_id]
        );
        return this.findOne(guild_id);
    },
    async markDailyRewardRun(guild_id, dateKey) {
        await db.query(
            `UPDATE guild_configs
             SET last_daily_reward_run_key = ?
             WHERE guild_id = ?`,
            [dateKey, guild_id]
        );
        return this.findOne(guild_id);
    },
    async destroy(guild_id) {
        await db.query(
            'DELETE FROM guild_configs WHERE guild_id = ?',
            [guild_id]
        );
        return this.findOne(guild_id);
    }
});
