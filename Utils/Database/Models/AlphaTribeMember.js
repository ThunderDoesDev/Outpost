module.exports = (db) => ({
    normalizeRole(role) {
        const normalized = String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (normalized === 'owner') return 'owner';
        return 'member';
    },
    async add(data) {
        await db.query(
            `INSERT INTO alpha_tribe_members (guild_id, tribe_name, user_id, xbox_gt, ign, role, added_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                xbox_gt = COALESCE(VALUES(xbox_gt), xbox_gt),
                ign = COALESCE(VALUES(ign), ign),
                role = VALUES(role),
                added_by = VALUES(added_by)`,
            [
                data.guild_id,
                data.tribe_name,
                data.user_id,
                data.xbox_gt || null,
                data.ign || null,
                this.normalizeRole(data.role),
                data.added_by || null
            ]
        );
    },
    async linkIdentity(data) {
        await db.query(
            `INSERT INTO alpha_tribe_members (guild_id, tribe_name, user_id, xbox_gt, ign, role, added_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                xbox_gt = VALUES(xbox_gt),
                ign = VALUES(ign),
                added_by = VALUES(added_by)`,
            [
                data.guild_id,
                data.tribe_name,
                data.user_id,
                data.xbox_gt || null,
                data.ign || null,
                this.normalizeRole(data.role),
                data.added_by || null
            ]
        );
    },
    async findOne(guild_id, tribeName, user_id) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_members WHERE guild_id = ? AND tribe_name = ? AND user_id = ? LIMIT 1',
            [guild_id, tribeName, user_id]
        );
        return rows[0] || null;
    },
    async remove(guild_id, tribeName, user_id) {
        await db.query(
            'DELETE FROM alpha_tribe_members WHERE guild_id = ? AND tribe_name = ? AND user_id = ?',
            [guild_id, tribeName, user_id]
        );
    }
});
