const {
    storedToDisplayPoints,
    displayToStoredHundredths
} = require('../../Alpha/PointsDisplay');
const { isSameCalendarDayInZone } = require('../../Alpha/DailyRewardTime');
const {
    getPolicyAction,
    getWarningLevel,
    DEFAULT_WARNING_POLICY
} = require('../../Alpha/OffencePolicy');

const mapTribeRow = (row) => {
    if (!row) return null;
    return {
        ...row,
        points: storedToDisplayPoints(row.points)
    };
};

module.exports = (db) => ({
    async create(data) {
        const storedPoints = displayToStoredHundredths(data.points ?? 0);
        const [result] = await db.query(
            `INSERT INTO alpha_tribes (
                guild_id, tribe_name, owner_id, map_name, base_spot, points, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.guild_id,
                data.tribe_name,
                data.owner_id,
                data.map_name || null,
                data.base_spot || null,
                storedPoints,
                data.status || 'Active',
                data.created_by || null
            ]
        );
        return this.findById(data.guild_id, result.insertId);
    },
    async findById(guild_id, id) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribes WHERE guild_id = ? AND id = ? LIMIT 1',
            [guild_id, id]
        );
        return mapTribeRow(rows[0] || null);
    },
    async findAll(guild_id) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribes WHERE guild_id = ?',
            [guild_id]
        );
        return rows.map((row) => mapTribeRow(row));
    },
    async count(guild_id) {
        const [rows] = await db.query(
           'SELECT COUNT(*) FROM alpha_tribes WHERE guild_id = ?',
           [guild_id]
        );
        return rows[0]?.count || 0;
    },
    async findByName(guild_id, tribe_name) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribes WHERE guild_id = ? AND LOWER(tribe_name) = LOWER(?) LIMIT 1',
            [guild_id, tribe_name]
        );
        return mapTribeRow(rows[0] || null);
    },
    async findByNameOrId(guild_id, raw) {
        const trimmed = String(raw ?? '').trim();
        if (!trimmed) return null;
        if (/^\d+$/.test(trimmed)) {
            const byId = await this.findById(guild_id, Number.parseInt(trimmed, 10));
            if (byId) return byId;
        }
        return this.findByName(guild_id, trimmed);
    },
    async getMembers(guild_id, tribeName) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_members WHERE guild_id = ? AND tribe_name = ? ORDER BY role DESC, created_at ASC',
            [guild_id, tribeName]
        );
        return rows;
    },
    async getLeaderboard(guild_id, limit = 10) {
        const parsedLimit = Number.isInteger(limit) ? limit : parseInt(limit, 10);
        const safeLimit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), 25);
        const [rows] = await db.query(
            `SELECT id, tribe_name, owner_id, points, status
             FROM alpha_tribes
             WHERE guild_id = ? AND status != 'deleted'
             ORDER BY points DESC, updated_at DESC
             LIMIT ${safeLimit}`,
            [guild_id]
        );
        return rows.map((row) => mapTribeRow(row));
    },
    async addPoints(guild_id, tribeRecordId, amount) {
        const delta = displayToStoredHundredths(amount);
        const [result] = await db.query(
            'UPDATE alpha_tribes SET points = points + ? WHERE guild_id = ? AND id = ?',
            [delta, guild_id, tribeRecordId]
        );
        if (!result.affectedRows) return null;
        return this.findById(guild_id, tribeRecordId);
    },
    async removePoints(guild_id, tribeRecordId, amount) {
        const delta = displayToStoredHundredths(amount);
        const [result] = await db.query(
            'UPDATE alpha_tribes SET points = GREATEST(points - ?, 0) WHERE guild_id = ? AND id = ?',
            [delta, guild_id, tribeRecordId]
        );
        if (!result.affectedRows) return null;
        return this.findById(guild_id, tribeRecordId);
    },
    async claimDailyReward(guild_id, tribeRecordId, rewardAmount = 1, options = {}) {
        const tribe = await this.findById(guild_id, tribeRecordId);
        if (!tribe) return null;
        const now = new Date();
        const claimedAt = tribe.last_daily_reward_at ? new Date(tribe.last_daily_reward_at) : null;
        const timeZone = options.timeZone || 'UTC';
        const sameDay = claimedAt && isSameCalendarDayInZone(claimedAt, now, timeZone);
        if (sameDay) {
            return {
                success: false,
                reason: 'already_claimed',
                tribe
            };
        }
        const [result] = await db.query(
            `UPDATE alpha_tribes
             SET points = points + ?, last_daily_reward_at = CURRENT_TIMESTAMP
             WHERE guild_id = ? AND id = ?`,
            [displayToStoredHundredths(rewardAmount), guild_id, tribeRecordId]
        );
        if (!result.affectedRows) return null;
        const updatedTribe = await this.findById(guild_id, tribeRecordId);
        return {
            success: true,
            tribe: updatedTribe
        };
    },
    async applyOffencePolicy(guild_id, tribeRecordId, baseDeduction = 1, options = {}) {
        const tribe = await this.findById(guild_id, tribeRecordId);
        if (!tribe) return null;
        const policy = options.policy || DEFAULT_WARNING_POLICY;
        const shouldCountOffence = options.countTowardWarning !== false;
        const currentOffenceCount = Number(tribe.offence_count || 0);
        const nextOffenceCount = shouldCountOffence ? currentOffenceCount + 1 : currentOffenceCount;
        const policyAction = getPolicyAction(nextOffenceCount, policy);
        const action = policyAction.action;
        const warningLevel = Math.max(
            Number(tribe.warning_level || 0),
            getWarningLevel(nextOffenceCount, policy)
        );
        let percentDeduction = 0;
        if (action === 'warning-2') percentDeduction = 25;
        else if (action === 'warning-3') percentDeduction = 50;

        const percentageAmount = percentDeduction > 0 ? Math.floor(Number(tribe.points || 0) * (percentDeduction / 100)) : 0;
        const totalDeduction = baseDeduction + percentageAmount;
        const deductStored = displayToStoredHundredths(totalDeduction);
        const [result] = await db.query(
            `UPDATE alpha_tribes
             SET points = CASE
                    WHEN ? = 'claim-removed' THEN 0
                    ELSE GREATEST(points - ?, 0)
                 END,
                 offence_count = ?,
                 warning_level = ?,
                 status = CASE
                    WHEN ? = 'claim-removed' THEN 'deleted'
                    ELSE status
                 END
             WHERE guild_id = ? AND id = ?`,
            [action, deductStored, nextOffenceCount, warningLevel, action, guild_id, tribeRecordId]
        );
        if (!result.affectedRows) return null;
        const updatedTribe = await this.findById(guild_id, tribeRecordId);
        return {
            tribe: updatedTribe,
            offenceCount: nextOffenceCount,
            warningLevel,
            action,
            countTowardWarning: shouldCountOffence,
            baseDeduction,
            percentageAmount,
            totalDeduction
        };
    },
    async update(guild_id, tribeRecordId, fields) {
        const allowed = ['tribe_name', 'owner_id', 'map_name', 'base_spot', 'status', 'points'];
        const updates = [];
        const values = [];
        const existingTribe = await this.findById(guild_id, tribeRecordId);
        if (!existingTribe) return null;
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(fields, key) && fields[key] !== undefined) {
                updates.push(`${key} = ?`);
                values.push(key === 'points' ? displayToStoredHundredths(fields[key]) : fields[key]);
            }
        }
        if (updates.length === 0) return null;
        values.push(guild_id, tribeRecordId);
        const [result] = await db.query(
            `UPDATE alpha_tribes SET ${updates.join(', ')} WHERE guild_id = ? AND id = ?`,
            values
        );
        if (!result.affectedRows) return null;
        if (fields.tribe_name && fields.tribe_name !== existingTribe.tribe_name) {
            await db.query(
                'UPDATE alpha_tribe_members SET tribe_name = ? WHERE guild_id = ? AND tribe_name = ?',
                [fields.tribe_name, guild_id, existingTribe.tribe_name]
            );
            await db.query(
                'UPDATE alpha_tribe_threads SET tribe_name = ? WHERE guild_id = ? AND tribe_name = ?',
                [fields.tribe_name, guild_id, existingTribe.tribe_name]
            );
            await db.query(
                'UPDATE alpha_tribe_photos SET tribe_name = ? WHERE guild_id = ? AND tribe_name = ?',
                [fields.tribe_name, guild_id, existingTribe.tribe_name]
            );
        }
        return this.findById(guild_id, tribeRecordId);
    },
    async removeWithRelations(guild_id, tribeRecordId) {
        const tribe = await this.findById(guild_id, tribeRecordId);
        if (!tribe) return false;
        await db.query(
            'DELETE FROM alpha_tribe_photos WHERE guild_id = ? AND tribe_name = ?',
            [guild_id, tribe.tribe_name]
        );
        await db.query(
            'DELETE FROM alpha_tribe_members WHERE guild_id = ? AND tribe_name = ?',
            [guild_id, tribe.tribe_name]
        );
        await db.query(
            'DELETE FROM alpha_tribe_threads WHERE guild_id = ? AND tribe_name = ?',
            [guild_id, tribe.tribe_name]
        );
        const [result] = await db.query(
            'DELETE FROM alpha_tribes WHERE guild_id = ? AND id = ?',
            [guild_id, tribeRecordId]
        );
        return result.affectedRows > 0;
    }
});
