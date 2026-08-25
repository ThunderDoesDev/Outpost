let pool;
let client;
const DATABASE_DATA_DIR = require('path').resolve(__dirname, '../../Database');

const getConfig = (client) => {
    const {
        database
    } = client.settings;
    return {
        user: database.username,
        password: database.password,
        host: database.host,
        database: database.dbName,
        port: database.port,
        // DECIMAL columns as JS numbers (not "36.00" strings); Discord still uses formatAlphaPoints.
        decimalNumbers: true
    };
};

const initializeDatabase = async (pool) => {
    try {
        const ensureColumnExists = async (tableName, columnName, columnDefinition) => {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS count
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = ?
                 AND COLUMN_NAME = ?`,
                [tableName, columnName]
            );
            if (!rows[0] || Number(rows[0].count) === 0) {
                await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
            }
        };
        const dropColumnIfExists = async (tableName, columnName) => {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS count
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = ?
                 AND COLUMN_NAME = ?`,
                [tableName, columnName]
            );
            if (rows[0] && Number(rows[0].count) > 0) {
                await pool.query(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
            }
        };
        const legacyTribeColumn = 'tribe' + '_id';
        const relaxLegacyTribeCodeColumn = async () => {
            const [rows] = await pool.query(
                `SELECT COLUMN_TYPE, IS_NULLABLE
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'alpha_tribes'
                   AND COLUMN_NAME = 'tribe_code'
                 LIMIT 1`
            );
            if (!rows[0]) return;
            const columnType = rows[0].COLUMN_TYPE || 'VARCHAR(255)';
            const isNullable = String(rows[0].IS_NULLABLE || '').toUpperCase() === 'YES';
            if (!isNullable) {
                await pool.query(`ALTER TABLE alpha_tribes MODIFY COLUMN tribe_code ${columnType} NULL`);
            }
        };
        const relaxAlphaMemberRoleColumn = async () => {
            const [rows] = await pool.query(
                `SELECT COLUMN_TYPE, COLUMN_DEFAULT
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'alpha_tribe_members'
                   AND COLUMN_NAME = 'role'
                 LIMIT 1`
            );
            if (!rows[0]) return;
            const columnType = String(rows[0].COLUMN_TYPE || '').toLowerCase();
            const columnDefault = String(rows[0].COLUMN_DEFAULT || '').trim().toLowerCase();
            const shouldRelax = columnType.startsWith('enum(') || !['member', 'owner'].includes(columnDefault);
            if (shouldRelax) {
                await pool.query(`ALTER TABLE alpha_tribe_members MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'member'`);
            }
        };
        await pool.query(`CREATE TABLE IF NOT EXISTS clients (
            client_id VARCHAR(255) PRIMARY KEY,
            client_name VARCHAR(255) NOT NULL,
            commands_used INT NOT NULL DEFAULT 0,
            maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
            debug_mode BOOLEAN NOT NULL DEFAULT FALSE
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS guild_configs (
            guild_id VARCHAR(32) PRIMARY KEY,
            forum_channel_id VARCHAR(32) NULL,
            logs_channel_id VARCHAR(32) NULL,
            announcements_channel_id VARCHAR(32) NULL,
            leaderboard_channel_id VARCHAR(32) NULL,
            leaderboard_message_id VARCHAR(32) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alpha_tribes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            tribe_name VARCHAR(150) NOT NULL,
            owner_id VARCHAR(32) NOT NULL,
            map_name VARCHAR(100) NULL,
            base_spot VARCHAR(150) NULL,
            points INT NOT NULL DEFAULT 0,
            status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
            created_by VARCHAR(32) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_alpha_tribe_guild_name (guild_id, tribe_name)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alpha_tribe_members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            tribe_name VARCHAR(150) NOT NULL,
            user_id VARCHAR(32) NOT NULL,
            xbox_gt VARCHAR(255) NULL,
            ign VARCHAR(255) NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'member',
            added_by VARCHAR(32) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_alpha_member (guild_id, tribe_name, user_id)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alpha_tribe_threads (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            tribe_name VARCHAR(150) NOT NULL,
            forum_channel_id VARCHAR(32) NOT NULL,
            thread_id VARCHAR(32) NOT NULL,
            main_message_id VARCHAR(32) NULL,
            created_by VARCHAR(32) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_alpha_thread (guild_id, tribe_name)
        )`);
        await pool.query(`CREATE TABLE IF NOT EXISTS alpha_tribe_photos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guild_id VARCHAR(32) NOT NULL,
            tribe_name VARCHAR(150) NOT NULL,
            thread_id VARCHAR(32) NOT NULL,
            message_id VARCHAR(32) NULL,
            uploaded_by VARCHAR(32) NOT NULL,
            image_url TEXT NOT NULL,
            file_name VARCHAR(255) NULL,
            caption VARCHAR(255) NULL,
            photo_order INT DEFAULT 1,
            approved TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        const columnExists = async (tableName, columnName) => {
            const [rows] = await pool.query(
                `SELECT COUNT(*) AS count
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                 AND TABLE_NAME = ?
                 AND COLUMN_NAME = ?`,
                [tableName, columnName]
            );
            return rows[0] && Number(rows[0].count) > 0;
        };
        const migrateGuildConfigAlphaPrefixedColumns = async () => {
            const table = 'guild_configs';
            if (await columnExists(table, 'alpha_public_logs_channel_id')) {
                if (!(await columnExists(table, 'public_logs_channel_id'))) {
                    await pool.query(
                        `ALTER TABLE ${table} CHANGE COLUMN alpha_public_logs_channel_id public_logs_channel_id VARCHAR(32) NULL`
                    );
                } else {
                    await pool.query(
                        `UPDATE ${table} SET public_logs_channel_id = COALESCE(public_logs_channel_id, alpha_public_logs_channel_id)`
                    );
                    await pool.query(`ALTER TABLE ${table} DROP COLUMN alpha_public_logs_channel_id`);
                }
            }
            if (await columnExists(table, 'alpha_announcements_channel_id')) {
                await pool.query(
                    `UPDATE ${table} SET announcements_channel_id = COALESCE(alpha_announcements_channel_id, announcements_channel_id)`
                );
                await pool.query(`ALTER TABLE ${table} DROP COLUMN alpha_announcements_channel_id`);
            }
            if (await columnExists(table, 'alpha_leaderboard_message_id')) {
                await pool.query(
                    `UPDATE ${table} SET leaderboard_message_id = COALESCE(alpha_leaderboard_message_id, leaderboard_message_id)`
                );
                await pool.query(`ALTER TABLE ${table} DROP COLUMN alpha_leaderboard_message_id`);
            }
            if (await columnExists(table, 'alpha_manager_role_id')) {
                if (!(await columnExists(table, 'manager_role_id'))) {
                    await pool.query(
                        `ALTER TABLE ${table} CHANGE COLUMN alpha_manager_role_id manager_role_id VARCHAR(32) NULL`
                    );
                } else {
                    await pool.query(
                        `UPDATE ${table} SET manager_role_id = COALESCE(manager_role_id, alpha_manager_role_id)`
                    );
                    await pool.query(`ALTER TABLE ${table} DROP COLUMN alpha_manager_role_id`);
                }
            }
            if (await columnExists(table, 'alpha_warning_policy')) {
                if (!(await columnExists(table, 'warning_policy'))) {
                    await pool.query(
                        `ALTER TABLE ${table} CHANGE COLUMN alpha_warning_policy warning_policy JSON NULL`
                    );
                } else {
                    await pool.query(
                        `UPDATE ${table} SET warning_policy = COALESCE(warning_policy, alpha_warning_policy)`
                    );
                    await pool.query(`ALTER TABLE ${table} DROP COLUMN alpha_warning_policy`);
                }
            }
        };
        await migrateGuildConfigAlphaPrefixedColumns();
        await dropColumnIfExists('guild_configs', 'announcement_logs_channel_id');
        await dropColumnIfExists('guild_configs', 'alpha_announcement_logs_channel_id');
        await ensureColumnExists('guild_configs', 'tribe_forum_channel_id', 'tribe_forum_channel_id VARCHAR(32) NULL');
        await ensureColumnExists('guild_configs', 'public_logs_channel_id', 'public_logs_channel_id VARCHAR(32) NULL');
        await ensureColumnExists('guild_configs', 'leaderboard_channel_id', 'leaderboard_channel_id VARCHAR(32) NULL');
        await ensureColumnExists('guild_configs', 'manager_role_id', 'manager_role_id VARCHAR(32) NULL');
        await ensureColumnExists('guild_configs', 'admin_command_logs_channel_id', 'admin_command_logs_channel_id VARCHAR(32) NULL');
        await ensureColumnExists('guild_configs', 'warning_policy', 'warning_policy JSON NULL');
        await ensureColumnExists('guild_configs', 'daily_reward_enabled', 'daily_reward_enabled TINYINT(1) NOT NULL DEFAULT 0');
        await ensureColumnExists('guild_configs', 'daily_reward_time', 'daily_reward_time VARCHAR(5) NULL');
        await ensureColumnExists('guild_configs', 'daily_reward_timezone', "daily_reward_timezone VARCHAR(64) NOT NULL DEFAULT 'UTC'");
        await ensureColumnExists('guild_configs', 'daily_reward_amount', 'daily_reward_amount INT NOT NULL DEFAULT 1');
        await ensureColumnExists('guild_configs', 'last_daily_reward_run_key', 'last_daily_reward_run_key VARCHAR(10) NULL');
        await dropColumnIfExists('guild_configs', 'reward_claimed');
        await dropColumnIfExists('guild_configs', 'reward_raided_online');
        await dropColumnIfExists('guild_configs', 'reward_raided_offline');
        await dropColumnIfExists('guild_configs', 'reward_won_event');
        await ensureColumnExists('alpha_tribes', 'map_name', 'map_name VARCHAR(100) NULL');
        await ensureColumnExists('alpha_tribes', 'base_spot', 'base_spot VARCHAR(150) NULL');
        await ensureColumnExists('alpha_tribes', 'offence_count', 'offence_count INT NOT NULL DEFAULT 0');
        await ensureColumnExists('alpha_tribes', 'warning_level', 'warning_level INT NOT NULL DEFAULT 0');
        await ensureColumnExists('alpha_tribes', 'last_daily_reward_at', 'last_daily_reward_at TIMESTAMP NULL');
        /** Points column stores INT hundredths (3600 = 36.00 display points). Migrates DECIMAL/FLOAT to INT. */
        const migrateAlphaTribePointsToIntHundredths = async () => {
            const [rows] = await pool.query(
                `SELECT COLUMN_TYPE
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'alpha_tribes'
                   AND COLUMN_NAME = 'points'
                 LIMIT 1`
            );
            if (!rows[0]) return;
            const columnType = String(rows[0].COLUMN_TYPE || '').toLowerCase();
            if (columnType.includes('int')) return;
            await pool.query(
                `UPDATE alpha_tribes SET points = ROUND(CAST(points AS DECIMAL(14,4)) * 100)`
            );
            await pool.query(
                'ALTER TABLE alpha_tribes MODIFY COLUMN points INT NOT NULL DEFAULT 0'
            );
        };
        await migrateAlphaTribePointsToIntHundredths();
        await ensureColumnExists('alpha_tribe_members', 'tribe_name', 'tribe_name VARCHAR(150) NULL');
        await ensureColumnExists('alpha_tribe_threads', 'tribe_name', 'tribe_name VARCHAR(150) NULL');
        await ensureColumnExists('alpha_tribe_photos', 'tribe_name', 'tribe_name VARCHAR(150) NULL');
        await pool.query(
            `UPDATE alpha_tribe_members member
             JOIN alpha_tribes tribe ON tribe.id = member.${legacyTribeColumn} AND tribe.guild_id = member.guild_id
             SET member.tribe_name = tribe.tribe_name
             WHERE member.tribe_name IS NULL`
        ).catch(() => null);
        await pool.query(
            `UPDATE alpha_tribe_threads thread
             JOIN alpha_tribes tribe ON tribe.id = thread.${legacyTribeColumn} AND tribe.guild_id = thread.guild_id
             SET thread.tribe_name = tribe.tribe_name
             WHERE thread.tribe_name IS NULL`
        ).catch(() => null);
        await pool.query(
            `UPDATE alpha_tribe_photos photo
             JOIN alpha_tribes tribe ON tribe.id = photo.${legacyTribeColumn} AND tribe.guild_id = photo.guild_id
             SET photo.tribe_name = tribe.tribe_name
             WHERE photo.tribe_name IS NULL`
        ).catch(() => null);
        await pool.query('ALTER TABLE alpha_tribe_members MODIFY COLUMN tribe_name VARCHAR(150) NOT NULL');
        await pool.query('ALTER TABLE alpha_tribe_threads MODIFY COLUMN tribe_name VARCHAR(150) NOT NULL');
        await pool.query('ALTER TABLE alpha_tribe_photos MODIFY COLUMN tribe_name VARCHAR(150) NOT NULL');
        await pool.query('ALTER TABLE alpha_tribe_members DROP INDEX uq_alpha_member').catch(() => null);
        await pool.query('ALTER TABLE alpha_tribe_threads DROP INDEX uq_alpha_thread').catch(() => null);
        await pool.query('ALTER TABLE alpha_tribe_members ADD UNIQUE KEY uq_alpha_member (guild_id, tribe_name, user_id)').catch(() => null);
        await pool.query('ALTER TABLE alpha_tribe_threads ADD UNIQUE KEY uq_alpha_thread (guild_id, tribe_name)').catch(() => null);
        await dropColumnIfExists('alpha_tribe_members', legacyTribeColumn);
        await dropColumnIfExists('alpha_tribe_threads', legacyTribeColumn);
        await dropColumnIfExists('alpha_tribe_photos', legacyTribeColumn);
        await ensureColumnExists('alpha_tribe_members', 'xbox_gt', 'xbox_gt VARCHAR(255) NULL');
        await ensureColumnExists('alpha_tribe_members', 'ign', 'ign VARCHAR(255) NULL');
        await relaxLegacyTribeCodeColumn();
        await relaxAlphaMemberRoleColumn();
        if (client && client.logger) {
            client.logger.log("MYSQL", "All tables initialized successfully");
        } else {
            console.log("[MYSQL] All tables initialized successfully");
        }
    } catch (error) {
        if (client && client.errors) {
            await client.errors(client, error, null, 'Database');
        } else {
            console.error(error);
            throw error;
        }
    }
};

const db = {
    get pool() {
        return pool;
    },
    async start(clientInstance) {
        try {
            client = clientInstance;
            client.modules.fs.mkdirSync(DATABASE_DATA_DIR, { recursive: true });
            const config = getConfig(client);
            // const dbName = config.database;
            // const tempConfig = {
            //     user: config.user,
            //     password: config.password,
            //     host: config.host,
            //     port: config.port
            // };
            // const tempPool = client.modules.mysqlPromise.createPool(tempConfig);
            // const tempConnection = await tempPool.getConnection();
            // // Create database if it doesn't exist
            // await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            // client.logger.log("MYSQL", `Database '${dbName}' created or already exists.`);
            // await tempConnection.release();
            // await tempPool.end();
            // // Now connect to the created database
            // const finalConfig = {
            //     ...config,
            //     database: dbName
            // };
            // pool = client.modules.mysqlPromise.createPool(finalConfig);
            pool = client.modules.mysqlPromise.createPool(config);
            await pool.getConnection();
            await initializeDatabase(pool);
            client.logger.log("MYSQL", `Database is connected and ready.`);
            return `Database Connected.`;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                client.errors(client, error, null, 'Database');
            }
            client.errors(client, error, null, 'Database');
        }
    },
    async close(client) {
        try {
            if (pool) {
                await pool.end();
            }
            client.logger.log("MYSQL", "Database connection closed.");
            return "Database Disconnected.";
        } catch (error) {
            client.errors(client, error, null, 'Database');
        }
    },
    async query(text, params = []) {
        try {
            if (!pool) {
                const err = new Error('Database pool is not initialized. Call database.start() first.');
                if (client) {
                    await client.errors(client, err, null, 'Database');
                }
                throw err;
            }
            return await pool.query(text, params);
        } catch (error) {
            if (client) {
                await client.errors(client, error, null, 'Database');
            }
            throw error;
        }
    }
};

// Models
db.models = {
    Client: require('./Models/Client.js')(db),
    GuildConfig: require('./Models/GuildConfig.js')(db),
    AlphaTribe: require('./Models/AlphaTribe.js')(db),
    AlphaTribeMember: require('./Models/AlphaTribeMember.js')(db),
    AlphaTribeThread: require('./Models/AlphaTribeThread.js')(db),
    AlphaTribePhoto: require('./Models/AlphaTribePhoto.js')(db)
};

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;