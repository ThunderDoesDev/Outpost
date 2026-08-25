module.exports = {
    name: 'help',
    description: 'Shows a list of all commands and their descriptions.',
    cooldowns: 3,
    usage: [],
    disabled: false,
    permissions: {
        client: [],
        user: [],
        staff: {
            developers: false
        }
    },
    options: [{
        name: 'command',
        description: 'The command to get help for',
        type: 3,
        required: false,
        autocomplete: true
    }],
    run: async (client, interaction) => {
        try {
            const commandOption = interaction.options.get('command');
            if (commandOption) {
                const selectedName = String(commandOption.value || '').toLowerCase();
                const selectedCommand = client.slash.get(selectedName) ||
                    Array.from(client.slash.values()).find((cmd) => String(cmd?.name || '').toLowerCase() === selectedName);
                if (selectedCommand) {
                    const helpEmbed = new client.modules.discord.EmbedBuilder()
                        .setColor(client.settings.bot.embedColor)
                        .setTitle(`${selectedCommand.name} - Command Information`)
                        .setDescription(selectedCommand.description)
                        .addFields([{
                            name: 'Category:',
                            value: `${selectedCommand.category ? selectedCommand.category : 'No category provided'}`
                        }, {
                            name: 'Usage:',
                            value: `${selectedCommand.usage.join(' ') ? selectedCommand.usage.join(' ') : 'No usage provided'}`
                        }, {
                            name: 'Disabled:',
                            value: `${selectedCommand.disabled ? 'Yes' : 'No'}`
                        }])
                        .setThumbnail(client.user.displayAvatarURL({
                            dynamic: true
                        }))
                        .setFooter({
                        text: client.footer
                    })
                    .setTimestamp();
                    return interaction.reply({
                        embeds: [helpEmbed]
                    });
                }
            }
            const commandEntries = [];
            const commandKeys = new Set();
            client.slash.forEach((command, key) => {
                if (!command || !command.name || !command.description) return;
                if (command.disabled === true) return;
                if (command.permissions?.staff?.developers === true) return;
                if (command.category === 'standalone') {
                    const slashName = `/${command.name.toLowerCase()}`;
                    if (commandKeys.has(slashName)) return;
                    commandKeys.add(slashName);
                    commandEntries.push({
                        category: 'Standalone',
                        slash: slashName,
                        description: command.description
                    });
                    return;
                }
                const keyParts = String(key || '').split('-');
                const rootCategory = keyParts[0] || command.category || 'other';
                const group = command.group ? `${command.group.toLowerCase()} ` : '';
                const slashName = `/${rootCategory.toLowerCase()} ${group}${command.name.toLowerCase()}`;
                if (commandKeys.has(slashName)) return;
                commandKeys.add(slashName);
                commandEntries.push({
                    category: rootCategory.charAt(0).toUpperCase() + rootCategory.slice(1).toLowerCase(),
                    slash: slashName,
                    description: command.description
                });
            });
            if (commandEntries.length === 0) {
                return client.responses('Commands.Help.NoCommands', interaction);
            }
            commandEntries.sort((a, b) => {
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                return a.slash.localeCompare(b.slash);
            });
            const grouped = new Map();
            for (const entry of commandEntries) {
                if (!grouped.has(entry.category)) {
                    grouped.set(entry.category, []);
                }
                grouped.get(entry.category).push(entry);
            }
            const fields = Array.from(grouped.entries()).slice(0, 25).map(([category, entries]) => {
                const value = entries
                    .slice(0, 10)
                    .map((entry) => `\`${entry.slash}\` - ${entry.description}`)
                    .join('\n');
                const hiddenCount = Math.max(entries.length - 10, 0);
                return {
                    name: `${category} Commands (${entries.length})`,
                    value: hiddenCount > 0 ? `${value}\n...and ${hiddenCount} more.` : value
                };
            });
            const helpEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Help`)
                .setDescription('Here are the currently available slash commands.')
                .setThumbnail(client.user.displayAvatarURL({
                    dynamic: true
                }))
                .addFields(fields)
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.reply({
                embeds: [helpEmbed]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (!focusedOption) {
                return interaction.respond([{
                    name: 'No Data',
                    value: "no_data"
                }]);
            }
            const commands = Array.from(client.slash.values());
            if ((!commands || commands.length === 0) && focusedOption.name === 'command') {
                return interaction.respond([{
                    name: 'No Commands Found',
                    value: "no_commands"
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            let options = [];
            if (focusedOption.name === 'command') {
                const uniqueByName = Array.from(new Map(
                    commands
                        .filter((command) => command && command.name)
                        .map((command) => [String(command.name).toLowerCase(), command])
                ).values());
                options = uniqueByName
                    .filter((command) => String(command.name || '').toLowerCase().includes(focusedValue))
                    .slice(0, 25)
                    .map((command) => {
                        const category = String(command.category || '').toLowerCase();
                        const commandLabel = category === 'standalone'
                            ? `/${command.name}`
                            : `/${category.charAt(0).toUpperCase() + category.slice(1)} ${command.name}`;
                        return {
                            name: commandLabel,
                            value: command.name
                        };
                    });
            }
            return interaction.respond(options.length ? options : [{
                name: 'No Matches Found',
                value: 'no_matches'
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};