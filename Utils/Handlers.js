const path = require('path');

const commandsPath = path.join(__dirname, '../Commands');
const eventsPath = path.join(__dirname, '../Events');

/**
 * LOAD THE CLIENT EVENTS
*/
const eventsLoader = async function (client) {
    try {
        client.modules.fs.readdir(eventsPath, async (err, files) => {
            let data = []
            if (files) {
                await files.map(async (folder) => {
                    data.push(folder)
                })
            }
            if (data.length !== 0) {
                let loadedEvents = 0;
                await data.forEach(folderName => {
                    client.modules.fs.readdir(path.join(eventsPath, folderName), (err, files) => {
                        if (err) console.error(err);
                        let jsfiles = files.filter(f => f.split(".").pop().toLowerCase() === "js");
                        if (jsfiles.length > 0) {
                            jsfiles.forEach((f) => {
                                loadedEvents = loadedEvents + 1;
                                try {
                                    const event = require(`../Events/${folderName}/${f}`);
                                    let eventname = f.replace('.js', '');
                                    if (eventname) {
                                        const discordEventName = eventname.charAt(0).toLowerCase() + eventname.slice(1);
                                        client.on(discordEventName, event.run.bind(null, client));
                                    }
                                } catch (err) {
                                    console.error(`Error loading event ${f}:`, err);
                                }
                            });
                        }
                    });
                });
            }
        })
    } catch (error) {
        return client.errors(client, error.stack, 'Event');
    }
}

/**
 * LOAD THE COMMANDS
*/
const commandsLoader = async function (client) {
    try {
        client.modules.fs.readdir(commandsPath, async (err, items) => {
            let folders = []
            let standaloneFiles = []
            if (items) {
                items.forEach((item) => {
                    try {
                        const itemPath = path.join(commandsPath, item);
                        const stats = client.modules.fs.statSync(itemPath);
                        if (stats.isFile() && item.endsWith('.js')) {
                            standaloneFiles.push(item);
                        } else if (stats.isDirectory()) {
                            folders.push(item);
                        }
                    } catch (err) {
                        // Skip items that can't be checked
                    }
                });
            }
            // Load standalone commands
            standaloneFiles.forEach((file) => {
                try {
                    let props = require(`../Commands/${file}`);
                    if (props && props.name) {
                        props.category = 'standalone';
                        client.slash.set(props.name.toLowerCase(), props);
                    }
                } catch (error) {
                    console.error(`Error loading standalone command ${file}:`, error);
                }
            });
            // Load folder-based commands (existing logic)
            if (folders.length !== 0) {
                folders.map(folderName => {
                    client.modules.fs.readdir(path.join(commandsPath, folderName), (err, files) => {
                        let jsfiles = files.filter(f => f.split(".").pop() === "js");
                        if (jsfiles.length > 0) {
                            jsfiles.forEach((f) => {
                                let props = require(`../Commands/${folderName}/${f}`);
                                if (props) {
                                    props.category = folderName;
                                    const commandKey = props.group
                                        ? `${folderName.toLowerCase()}-${props.group.toLowerCase()}-${props.name.toLowerCase()}`
                                        : `${folderName.toLowerCase()}-${props.name.toLowerCase()}`;
                                    client.slash.set(commandKey, props);
                                }
                            });
                        }
                    });
                });
            }
        })
    } catch (error) {
        return client.errors(client, error.stack, 'Event');
    }
}

/**
 * LOAD THE SLASH COMMANDS
*/
const loadSlashCommands = async function (client) {
    try {
        const { SlashCommandBuilder, ApplicationCommandOptionType, Routes, REST } = client.modules.discord;
        let slashCmds = [];
        let subCommands = [];
        let standaloneCommands = [];
        let loadedCommands = 0;
        await client.modules.fs.readdir(commandsPath, async (err, items) => {
            let folders = []
            let standaloneFiles = []
            if (items) {
                items.forEach((item) => {
                    try {
                        const itemPath = path.join(commandsPath, item);
                        const stats = client.modules.fs.statSync(itemPath);
                        if (stats.isFile() && item.endsWith('.js')) {
                            standaloneFiles.push(item);
                        } else if (stats.isDirectory()) {
                            folders.push(item);
                        }
                    } catch (err) {
                        // Skip items that can't be checked
                    }
                });
            }
            // Register standalone commands
            standaloneFiles.forEach((file) => {
                try {
                    let props = require(`../Commands/${file}`);
                    if (props && props.name && props.description) {
                        let slashCommand = new SlashCommandBuilder()
                            .setName(props.name.toLowerCase())
                            .setDescription(props.description);
                        if (props.options && props.options.length > 0) {
                            props.options.forEach(opt => {
                                if (opt.type === ApplicationCommandOptionType.User) {
                                    slashCommand.addUserOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Boolean) {
                                    slashCommand.addBooleanOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Channel) {
                                    slashCommand.addChannelOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Integer) {
                                    slashCommand.addIntegerOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Mentionable) {
                                    slashCommand.addMentionableOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Number) {
                                    slashCommand.addNumberOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Role) {
                                    slashCommand.addRoleOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.Attachment) {
                                    slashCommand.addAttachmentOption((option) =>
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                    )
                                }
                                if (opt.type === ApplicationCommandOptionType.String) {
                                    slashCommand.addStringOption((option) => {
                                        option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required);
                                        if (opt.choices && opt.choices.length !== 0) {
                                            opt.choices.forEach(choice => {
                                                option.addChoices({
                                                    name: `${choice.name}`,
                                                    value: `${choice.value}`
                                                })
                                            })
                                        }
                                        if((!opt.choices || opt.choices.length == 0) && opt.autocomplete == true) {
                                            option.setAutocomplete(true)
                                        }
                                        return option;
                                    })
                                }
                            });
                        }
                        loadedCommands++;
                        standaloneCommands.push(props.name);
                        slashCmds.push(slashCommand.toJSON());
                    }
                } catch (error) {
                    console.error(`Error loading standalone command ${file}:`, error);
                }
            });
            // Load folder-based commands (existing logic)
            if (folders.length !== 0) {
                await folders.map(async folderName => {
                    await client.modules.fs.readdir(path.join(commandsPath, folderName), async (err, files) => {
                        let slashcommands = new SlashCommandBuilder().setName(`${folderName.toLowerCase()}`).setDescription(`${folderName} commands`);
                        const groups = new Map();
                        if (err) console.error(err);
                        let jsfiles = files.filter(f => f.split(".").pop() === "js");
                        if (jsfiles.length > 0) {
                            await jsfiles.forEach(async (f) => {
                                let props = require(`../Commands/${folderName}/${f}`);
                                let SubCommand = null;
                                if (props && props.group) {
                                    const groupName = props.group.toLowerCase();
                                    if (!groups.has(groupName)) {
                                        let groupBuilder = null;
                                        slashcommands.addSubcommandGroup((group) => {
                                            groupBuilder = group;
                                            return group.setName(groupName).setDescription(`${groupName} commands`);
                                        });
                                        groups.set(groupName, groupBuilder);
                                    }
                                    const group = groups.get(groupName);
                                    group.addSubcommand((subcommand) => {
                                        SubCommand = subcommand;
                                        return subcommand;
                                    });
                                } else {
                                    await slashcommands.addSubcommand((subcommand) => SubCommand = subcommand);
                                }
                                if (props && SubCommand) {
                                    subCommands.push(props.group ? `${props.group} ${props.name}` : props.name)
                                    SubCommand.setName(`${props.name.toLowerCase()}`)
                                    SubCommand.setDescription(`${props.description}`);
                                    if (props.options && props.options.length > 0) {
                                        await props.options.map(async opt => {
                                            if (opt.type === ApplicationCommandOptionType.User) {
                                                SubCommand.addUserOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Boolean) {
                                                SubCommand.addBooleanOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Channel) {
                                                SubCommand.addChannelOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Integer) {
                                                SubCommand.addIntegerOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Mentionable) {
                                                SubCommand.addMentionableOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Number) {
                                                SubCommand.addNumberOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Role) {
                                                SubCommand.addRoleOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.Attachment) {
                                                SubCommand.addAttachmentOption((option) =>
                                                    option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required),
                                                )
                                            }
                                            if (opt.type === ApplicationCommandOptionType.String) {
                                                let option = null;
                                                await SubCommand.addStringOption((opt) => option = opt)
                                                if (option) {
                                                    if (opt.choices && opt.choices.length !== 0) {
                                                        await opt.choices.map(opt => {
                                                            option.addChoices({
                                                                name: `${opt.name}`,
                                                                value: `${opt.value}`
                                                            })
                                                        })
                                                    }
                                                    await option.setName(`${opt.name.toLowerCase()}`).setDescription(`${opt.description}`).setRequired(opt.required)
                                                    if((!opt.choices || opt.choices.length == 0) && opt.autocomplete == true) {
                                                        option.setAutocomplete(true)
                                                    }
                                                }
                                            }
                                        })
                                    }

                                }
                            });
                        }
                        setTimeout(async () => {
                            loadedCommands = loadedCommands + slashcommands.options.length;
                            let slash = slashcommands.toJSON()
                            await slashCmds.push(slash);
                        }, 2000)
                    });
                });
            }
        })
        setTimeout(async () => {
            const rest = new REST({
                version: '10'
            }).setToken(client.settings.bot.token);
            await rest.put(Routes.applicationCommands(client.user.id), {
                body: slashCmds
            }).then(s => {
                const categoryCount = slashCmds.length - standaloneCommands.length;
                const totalSlashCommands = standaloneCommands.length + subCommands.length;
                client.logger.log(`EVENTS`, `Loaded (${client._eventsCount}) Events.`)
                client.logger.log(`REGISTERED COMMANDS`, `Loaded (${loadedCommands}/${client.slash.size}) Slash Commands.`)
                client.logger.log("SLASH", `Registered ${categoryCount} as Slash Categorys and ${totalSlashCommands} Slash Commands.`)
            }).catch(e => {
                client.logger.error(`Err registering slash -> ${e}`)
            })
        }, 3000) // when u hve lot commands best to raise this time a bit so u make sure it loaded all commands into the slashCmds array 
    } catch (error) {
        return client.errors(client, error.stack, 'Event');
    }
}

module.exports = {
    eventsLoader,
    commandsLoader,
    loadSlashCommands
};