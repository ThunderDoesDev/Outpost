const { startDailyRewardScheduler } = require('../../Utils/Alpha/DailyRewardScheduler');

async function updateStatus(client) {
    const [countRows] = await client.database.query('SELECT COUNT(*) AS total FROM alpha_tribes');
    const totalAlphaClaims = Number(countRows?.[0]?.total || 0);
    const statuses = [
        `Managing Alpha Tribe System`,
        `ARK Cluster`,
        `Total Alpha Claims: ${totalAlphaClaims}`,
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    client.user.setPresence({
        activities: [{
            name: status,
            state: status,
            type: client.modules.discord.ActivityType.Custom
        }],
        status: 'online'
    });
}

module.exports.run = async (client) => {
    try {
        client.handlers.loadSlashCommands(client);
        await client.database.start(client);
        await updateStatus(client);
        setInterval(() => updateStatus(client), 100000);
        startDailyRewardScheduler(client);
        const clientDB = await client.database.models.Client.findOne({
            client_id: client.user.id
        });
        if (!clientDB) {
            await client.database.models.Client.create({
                client_id: client.user.id,
                client_name: client.user.username,
                commands_used: 0,
                maintenance_mode: false,
                debug_mode: false
            });
        }
        const [tribeRows] = await client.database.query('SELECT COUNT(*) AS total FROM alpha_tribes');
        const totalTribes = Number(tribeRows?.[0]?.total || 0);
        client.logger.log('WHO AM I', `Logged In As ${client.user.tag}`);
        client.logger.log("CONNECTED", "Connected To Discord's V10 Gateway");
        client.logger.log("ALPHA CLAIMS", `${totalTribes} Tribes Found`);
    } catch (error) {
        return client.errors(client, error.stack, null, 'Event');
    }
}