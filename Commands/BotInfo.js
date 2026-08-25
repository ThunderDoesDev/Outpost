module.exports = {
    name: 'botinfo',
    description: 'Shows information and statistics about the bot.',
    cooldowns: 5,
    usage: [],
    disabled: false,
    permissions: {
        client: [],
        user: [],
        staff: {
            developers: false
        }
    },
    run: async (client, interaction) => {
        try {
            const formatUptime = (uptimeMs) => {
                const duration = client.modules.moment.duration(uptimeMs);
                const parts = [];
                const days = Math.floor(duration.asDays());
                if (days > 0) parts.push(`${days}d`);
                if (duration.hours() > 0) parts.push(`${duration.hours()}h`);
                if (duration.minutes() > 0) parts.push(`${duration.minutes()}m`);
                parts.push(`${duration.seconds()}s`);
                return parts.join(' ');
            };
            const formatBytes = (bytes) => {
                if (!bytes || bytes <= 0) return '0 MB';
                const mb = bytes / 1024 / 1024;
                if (mb < 1024) return `${mb.toFixed(2)} MB`;
                return `${(mb / 1024).toFixed(2)} GB`;
            };

            const getPlatformName = () => {
                const platformMap = {
                    win32: 'Windows',
                    darwin: 'macOS',
                    linux: 'Linux',
                    freebsd: 'FreeBSD',
                    openbsd: 'OpenBSD',
                    sunos: 'SunOS',
                    aix: 'AIX',
                    android: 'Android'
                };
                const platform = client.modules.os.platform();
                return platformMap[platform] || (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown');
            };
            const totalMembers = client.guilds.cache.reduce(
                (acc, guild) => acc + (guild.memberCount || 0),
                0
            );
            const totalGuilds = client.guilds.cache.size;
            const memoryUsage = process.memoryUsage();
            const cpuModel = (client.modules.os.cpus()[0] && client.modules.os.cpus()[0].model) || 'Unknown';
            const developerMentions = (client.settings.bot.developer || [])
                .map((id) => `<@${id}>`)
                .join(', ') || 'None';
            const botCreatedTimestamp = Math.floor((client.user.createdTimestamp || Date.now()) / 1000);
            const [tribeRows] = await client.database.query('SELECT COUNT(*) AS total FROM alpha_tribes');
            const totalTribes = Number(tribeRows?.[0]?.total || 0);
            const embed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Bot Information`)
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .addFields([{
                    name: 'General:',
                    value: [
                        `**Name:** ${client.user.tag}`,
                        `**ID:** ${client.user.id}`,
                        `**Version:** v${client.packages.version}`,
                        `**Created:** <t:${botCreatedTimestamp}:R>`,
                        `**Developer:** ${developerMentions}`
                    ].join('\n')
                }, {
                    name: 'Statistics:',
                    value: [
                        `**Servers:** \`${totalGuilds.toLocaleString()}\``,
                        `**Users:** \`${totalMembers.toLocaleString()}\``,
                        `**Alpha Tribes:** \`${totalTribes.toLocaleString()}\``,
                        `**Commands:** \`${client.slash.size.toLocaleString()}\``
                    ].join('\n')
                }, {
                    name: 'Performance:',
                    value: [
                        `**Uptime:** ${formatUptime(client.uptime || 0)}`,
                        `**WS Ping:** \`${Math.max(client.ws.ping, 0)}ms\``,
                        `**RAM (RSS):** \`${formatBytes(memoryUsage.rss)}\``,
                        `**Heap Used:** \`${formatBytes(memoryUsage.heapUsed)}\``
                    ].join('\n')
                }, {
                    name: 'System:',
                    value: [
                        `**Node.js:** ${process.version}`,
                        `**discord.js:** v${client.modules.discord.version}`,
                        `**Platform:** ${getPlatformName()} (${process.arch})`,
                        `**CPU:** ${cpuModel}`
                    ].join('\n')
                }])
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.reply({
                embeds: [embed]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
