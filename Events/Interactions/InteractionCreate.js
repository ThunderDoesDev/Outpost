const { postAdminCommandLog } = require('../../Utils/AdminCommandLogs');

module.exports.run = async (client, interaction, args) => {
    try {
        // Client Database Check
        const clientDB = await client.database.models.Client.findOne({ client_id: client.user.id });
        //
        // Autocomplete Handling
        if (interaction.type === client.modules.discord.InteractionType.ApplicationCommandAutocomplete && !interaction.user.bot) {
            let subCmd = null;
            let subCmdGroup = null;
            let cmd = null;
            let commandKey = null;
            try {
                subCmd = interaction.options.getSubcommand(false);
                subCmdGroup = interaction.options.getSubcommandGroup(false);
            } catch (error) {
                // Ignore error, will check below
            }
            if (subCmd) {
                // Categorized command (has subcommand)
                commandKey = subCmdGroup
                    ? `${interaction.commandName}-${subCmdGroup}-${subCmd}`
                    : `${interaction.commandName}-${subCmd}`;
                cmd = client.slash.get(commandKey);
            } else {
                // Standalone command (no subcommand)
                commandKey = interaction.commandName.toLowerCase();
                cmd = client.slash.get(commandKey);
            }
            if (!cmd || !cmd.autocomplete) {
                return;
            }
            return cmd.autocomplete(client, interaction, args);
        }
        // Handle Application Command Interactions
        if (interaction.type === client.modules.discord.InteractionType.ApplicationCommand && !interaction.user.bot) {
            // Maintenance Mode Check
            const developerIds = Array.isArray(client.settings.bot.developer) ? client.settings.bot.developer : [client.settings.bot.developer];
            const isDeveloper = developerIds.includes(interaction.member.id);
            if (client.settings.bot.maintenanceMode === true && !isDeveloper) {
                if (interaction.guild) {
                    const ourGuilds = client.settings.bot.ourGuilds || [];
                    if (!ourGuilds.includes(interaction.guild.id)) {
                        return client.responses('Events.InteractionCreate.maintenanceMode', interaction, {
                            botName: client.user.username
                        });
                    }
                } else {
                    return client.responses('Events.InteractionCreate.maintenanceMode', interaction, {
                        botName: client.user.username
                    });
                }
            }            
            let subCmd = null;
            let subCmdGroup = null;
            let cmd = null;
            let commandKey = null;            
            try {
                subCmd = interaction.options.getSubcommand(false); // false means it won't throw if no subcommand
                subCmdGroup = interaction.options.getSubcommandGroup(false);
            } catch (error) {
                // Ignore error, will check below
            }            
            if (subCmd) {
                // Categorized command (has subcommand)
                commandKey = subCmdGroup
                    ? `${interaction.commandName}-${subCmdGroup}-${subCmd}`
                    : `${interaction.commandName}-${subCmd}`;
                cmd = client.slash.get(commandKey);
            } else {
                // Standalone command (no subcommand)
                commandKey = interaction.commandName.toLowerCase();
                cmd = client.slash.get(commandKey);
            }            
            if (!cmd) {
                return client.responses('Events.InteractionCreate.noCommandMatching', interaction);
            }
            if (!developerIds.includes(interaction.member.id)) {
                const now = Date.now();
                const cooldownAmount = Math.floor(cmd.cooldowns || 3) * 1000;
                if (!client.cooldowns.has(cmd.name)) {
                    client.cooldowns.set(cmd.name, new Map());
                }
                const timestamps = client.cooldowns.get(cmd.name);
                if (timestamps.has(interaction.member.id)) {
                    const expirationTime = timestamps.get(interaction.member.id) + cooldownAmount;
                    if (now < expirationTime) {
                        const timeLeft = (expirationTime - now) / 1000;
                        if (timeLeft > 0.9) {
                            return client.responses('Events.InteractionCreate.cmdOnCooldown', interaction, {
                                cmdName: cmd.name,
                                time: timeLeft.toFixed(1)
                            });
                        }
                    }
                }
                timestamps.set(interaction.member.id, now);
                setTimeout(() => timestamps.delete(interaction.member.id), cooldownAmount);
            }
            // Commands Disabled
            if (cmd.disabled === true && !isDeveloper) {
                return client.responses('Events.InteractionCreate.cmdDisabled', interaction, {
                    cmdName: cmd.name
                });
            }
            // // Client Commands logging
            // const fetchChannel = client.channels.cache.find(chan => chan.id === client.settings.channels.commands) || null;
            // if (fetchChannel) {
            //     const embed = new client.modules.discord.EmbedBuilder()
            //         .setTitle(`${interaction.guild.name} • Slash Used`)
            //         .addFields({
            //             name: `**Slash Used:**`,
            //             value: subCmd ? `/${interaction.commandName} ${subCmdGroup ? `${subCmdGroup} ` : ''}${subCmd}` : `/${interaction.commandName}`
            //         }, {
            //             name: `**Command Type:**`,
            //             value: subCmd
            //                 ? `Category: ${interaction.commandName} | ${subCmdGroup ? `Group: ${subCmdGroup} | ` : ''}Subcommand: ${subCmd}`
            //                 : 'Standalone'
            //         }, {
            //             name: `**Guild ID:**`,
            //             value: interaction.guild.id
            //         }, {
            //             name: `**Guild Name:**`,
            //             value: interaction.guild.name
            //         }, {
            //             name: `**Channel ID:**`,
            //             value: interaction.channel.id
            //         }, {
            //             name: `**Channel Name:**`,
            //             value: interaction.channel.name
            //         }, {
            //             name: `**User:**`,
            //             value: `${interaction.user.username} (${interaction.user.id})`
            //         })
            //         .setColor(client.settings.bot.embedColor)
            //         .setFooter({
            //             text: client.footer
            //         })
            //         .setThumbnail(client.user.displayAvatarURL({
            //             dynamic: true
            //         }))
            //         .setTimestamp();
            //     await fetchChannel.send({
            //         embeds: [embed]
            //     });
            // }
            // Permissions
            // Check user permissions
            if (cmd.permissions.user && cmd.permissions.user.length > 0) {
                const missingUserPerms = cmd.permissions.user.filter(perm => !interaction.member.permissions.has(perm));
                if (missingUserPerms.length > 0) {
                    const permNames = missingUserPerms.map(perm => {
                        const permName = Object.keys(client.modules.discord.PermissionsBitField.Flags).find(
                            key => client.modules.discord.PermissionsBitField.Flags[key] === perm
                        );
                        return permName || 'Unknown Permission';
                    });
                    return client.responses('Events.InteractionCreate.requiredUserPermissions', interaction, {
                        commandName: cmd.name,
                        permissions: permNames.join(', ')
                    });
                }
            }
            // Check bot permissions
            if (cmd.permissions.client && cmd.permissions.client.length > 0) {
                const missingBotPerms = cmd.permissions.client.filter(perm => !interaction.guild.members.me.permissions.has(perm));
                if (missingBotPerms.length > 0) {
                    const permNames = missingBotPerms.map(perm => {
                        const permName = Object.keys(client.modules.discord.PermissionsBitField.Flags).find(
                            key => client.modules.discord.PermissionsBitField.Flags[key] === perm
                        );
                        return permName || 'Unknown Permission';
                    });
                    return client.responses('Events.InteractionCreate.requiredBotPermissions', interaction, {
                        commandName: cmd.name,
                        permissions: permNames.join(', '),
                        botName: client.user.username
                    });
                }
            }
            // Developer Only
            if (cmd.permissions.staff.developers && !isDeveloper) {
                return client.responses('Events.InteractionCreate.noDeveloper', interaction, {
                    cmdName: cmd.name,
                    botName: client.user.username
                });
            }
            // Maintenance Mode (Database Check)
            if (clientDB.maintenance_mode && !isDeveloper && !client.settings.bot.ourGuilds.includes(interaction.guild.id)) {
                return client.responses('Events.InteractionCreate.maintenanceMode', interaction, {
                    botName: client.user.username
                });
            }
            // Command Execution
            try {
                await postAdminCommandLog(client, interaction, {
                    subCmd,
                    subCmdGroup,
                    cmd
                });
                await cmd.run(client, interaction, args);
            } catch (error) {
                return client.errors(client, error.stack, interaction, 'Event');
            }
        }
    } catch (error) {
        return client.errors(client, error.stack, interaction, 'Event');
    }
};