module.exports = (db) => ({
    async upsert(data) {
        await db.query(
            `INSERT INTO alpha_tribe_threads (
                guild_id, tribe_name, forum_channel_id, thread_id, main_message_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                forum_channel_id = VALUES(forum_channel_id),
                thread_id = VALUES(thread_id),
                main_message_id = VALUES(main_message_id)`,
            [
                data.guild_id,
                data.tribe_name,
                data.forum_channel_id,
                data.thread_id,
                data.main_message_id || null,
                data.created_by || null
            ]
        );
        return this.findOne(data.guild_id, data.tribe_name);
    },
    async findOne(guild_id, tribeName) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_threads WHERE guild_id = ? AND tribe_name = ? LIMIT 1',
            [guild_id, tribeName]
        );
        return rows[0] || null;
    }
});
