module.exports = (db) => ({
    async create(data) {
        const [result] = await db.query(
            `INSERT INTO alpha_tribe_photos (
                guild_id, tribe_name, thread_id, message_id, uploaded_by, image_url, file_name, caption, photo_order, approved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.guild_id,
                data.tribe_name,
                data.thread_id,
                data.message_id || null,
                data.uploaded_by,
                data.image_url,
                data.file_name || null,
                data.caption || null,
                data.photo_order || 1,
                typeof data.approved === 'number' ? data.approved : 1
            ]
        );
        return this.findById(data.guild_id, result.insertId);
    },
    async findById(guild_id, id) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_photos WHERE guild_id = ? AND id = ? LIMIT 1',
            [guild_id, id]
        );
        return rows[0] || null;
    },
    async findOne(guild_id, tribeName, id) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_photos WHERE guild_id = ? AND tribe_name = ? AND id = ? LIMIT 1',
            [guild_id, tribeName, id]
        );
        return rows[0] || null;
    },
    async findByTribeName(guild_id, tribeName) {
        const [rows] = await db.query(
            'SELECT * FROM alpha_tribe_photos WHERE guild_id = ? AND tribe_name = ? AND approved = 1 ORDER BY photo_order ASC, id ASC',
            [guild_id, tribeName]
        );
        return rows;
    },
    async getNextOrder(guild_id, tribeName) {
        const [rows] = await db.query(
            'SELECT COALESCE(MAX(photo_order), 0) + 1 AS next_order FROM alpha_tribe_photos WHERE guild_id = ? AND tribe_name = ?',
            [guild_id, tribeName]
        );
        return rows[0]?.next_order || 1;
    },
    async removeById(guild_id, id) {
        await db.query(
            'DELETE FROM alpha_tribe_photos WHERE guild_id = ? AND id = ?',
            [guild_id, id]
        );
    }
});
