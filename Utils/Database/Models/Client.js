module.exports = (db) => ({
    async findOne(filter) {
        const [result] = await db.query(
            'SELECT * FROM clients WHERE client_id = ? LIMIT 1',
            [filter.client_id]
        );
        if (!result[0]) return null;
        const doc = result[0];
        doc.save = async () => {
            await db.query(
                'UPDATE clients SET maintenance_mode = ?, debug_mode = ? WHERE client_id = ?',
                [doc.maintenance_mode, doc.debug_mode, doc.client_id]
            );
        };
        return doc;
    },
    async create(data) {
        await db.query(`
            INSERT INTO clients (
                client_id,
                client_name,
                commands_used,
                maintenance_mode,
                debug_mode
            ) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                data.client_id,
                data.client_name,
                data.commands_used || 0,
                data.maintenance_mode || false,
                data.debug_mode || false
            ]
        );
        const [res2] = await db.query('SELECT * FROM clients WHERE client_id = ? LIMIT 1', [data.client_id]);
        const doc = res2[0];
        doc.save = async () => {
            await db.query(
                'UPDATE clients SET maintenance_mode = ?, debug_mode = ? WHERE client_id = ?',
                [doc.maintenance_mode, doc.debug_mode, doc.client_id]
            );
        };
        return doc;
    },
    async isInMaintenanceMode(client_id) {
        const [result] = await db.query(
            'SELECT maintenance_mode FROM clients WHERE client_id = ? LIMIT 1',
            [client_id]
        );
        return result[0]?.maintenance_mode || false;
    },
    async isInDebugMode(client_id) {
        const [result] = await db.query(
            'SELECT debug_mode FROM clients WHERE client_id = ? LIMIT 1',
            [client_id]
        );
        return result[0]?.debug_mode || false;
    },
    async updateCommandsCount(client_id) {
        await db.query(
            'UPDATE clients SET commands_used = commands_used + 1 WHERE client_id = ?',
            [client_id]
        );
    },  
    async commandsCount() {
        const [result] = await db.query('SELECT SUM(commands_used) as count FROM clients');
        return parseInt(result[0].count);
    }
});
