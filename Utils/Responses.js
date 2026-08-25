const getResponseTypes = (client) => {
    return {
        Reply: {
            color: client.modules.discord.Colors.Red,
            flags: client.modules.discord.MessageFlags.Ephemeral,
            sendMethod: 'Reply'
        },
        FollowUp: {
            color: client.modules.discord.Colors.Red,
            flags: client.modules.discord.MessageFlags.Ephemeral,
            sendMethod: 'FollowUp'
        },
        Channel: {
            color: client.modules.discord.Colors.Red,
            sendMethod: 'Send'
        }
    };
};
const RESPONSES = {
    Commands: {
        CommandInfo: {
            noCommandMatching: {
                title: 'No Command Matching',
                description: 'No command matching the provided name was found.',
                type: 'Reply'
            }
        },
        Announce: {
            InvalidChannel: {
                title: 'Channel Not Found',
                description: 'No alpha announcements channel is set for this server. Run `/setup` and set the alpha announcements channel (stored in the database).',
                type: 'Reply'
            },
            InvalidChannelServer: {
                title: 'Wrong Server',
                description: 'The configured announcements channel belongs to another server. Use this command from the server that owns that channel.',
                type: 'Reply'
            },
            InvalidChannelType: {
                title: 'Invalid Channel',
                description: 'Choose a text channel.',
                type: 'Reply'
            },
            InvalidServer: {
                title: 'Invalid Server',
                description: 'This command can only be used in a server.',
                type: 'Reply'
            }
        },
        Tribe: {
            InvalidTribeName: {
                title: 'Invalid Tribe Name',
                description: 'The tribe name must be between 3 and 30 characters long.',
                type: 'Reply'
            },
            Modify: {
                TribeNotFound: {
                    title: 'Tribe Not Found',
                    description: 'No tribe matched that name or id.',
                    type: 'Reply'
                },
                NoChanges: {
                    title: 'Nothing To Update',
                    description: 'Provide at least one field to change.',
                    type: 'Reply'
                },
                PointsAlreadyMatch: {
                    title: 'Points Unchanged',
                    description: 'That tribe already has **{current}** points. Enter a different total or change another field.',
                    type: 'Reply'
                },
                NameAlreadyTaken: {
                    title: 'Name In Use',
                    description: 'Another tribe is already using that name.',
                    type: 'Reply'
                },
                SameOwner: {
                    title: 'Same Owner',
                    description: 'Pick a different user as the new owner.',
                    type: 'Reply'
                },
                UpdateFailed: {
                    title: 'Update Failed',
                    description: 'The tribe could not be updated. Try again or contact support.',
                    type: 'Reply'
                },
                InvalidPoints: {
                    title: 'Invalid Points',
                    description: 'Use a non-negative number, e.g. 28 or 28.5 (comma allowed as the decimal separator).',
                    type: 'Reply'
                }
            }
        },
        Points: {
            InvalidPointsAmount: {
                title: 'Invalid Points Amount',
                description: 'The points amount must be greater than 0.',
                type: 'Reply'
            },
            InvalidPointsType: {
                title: 'Invalid Points Type',
                description: 'The points type must be one of the following: claimed, raided-online, raided-offline, won-event.',
                type: 'Reply'
            },
            InvalidOtherTribe: {
                title: 'Invalid Other Tribe',
                description: 'That other tribe was not found. Select a registered tribe from autocomplete.',
                type: 'Reply'
            },
            OtherTribeRequired: {
                title: 'Other Tribe Required',
                description: 'Provide the other tribe when the type is Raided Online or Raided Offline.',
                type: 'Reply'
            },
            OtherTribeCannotBeTheSame: {
                title: 'Invalid Other Tribe',
                description: 'The other tribe cannot be the same as the tribe.',
                type: 'Reply'
            },
            InvalidReason: {
                title: 'Invalid Reason',
                description: 'Select a valid reason from autocomplete.',
                type: 'Reply'
            },
            Add: {
                InvalidType: {
                    title: 'Invalid Points Type',
                    description: 'That points type is not valid for this command.',
                    type: 'Reply'
                },
                DailyAlreadyClaimed: {
                    title: 'Daily Reward Already Claimed',
                    description: 'This tribe has already claimed today\'s daily reward.',
                    type: 'Reply'
                },
                ManualAdjustmentReasonRequired: {
                    title: 'Reason Required',
                    description: 'Provide a reason when using Other.',
                    type: 'Reply'
                },
                ReasonOnlyForOther: {
                    title: 'Reason Not Allowed',
                    description: 'The reason option is only available when the type is Other.',
                    type: 'Reply'
                }
            },
            Remove: {
                ManualAdjustmentReasonRequired: {
                    title: 'Reason Required',
                    description: 'Provide a reason when using Manual Adjustment.',
                    type: 'Reply'
                }
            }
        },
        AddMembers: {
            TribeNotFound: {
                title: 'Tribe Not Found',
                description: 'The tribe was not found.',
                type: 'Reply'
            },
            MemberNotFound: {
                title: 'Member Not Found',
                description: 'The member was not found.',
                type: 'Reply'
            },
            MemberAlreadyLinked: {
                title: 'Member Already Linked',
                description: 'The member is already linked to the tribe.',
                type: 'Reply'
            },
            MemberNotLinked: {
                title: 'Member Not Linked',
                description: 'The member is not linked to the tribe.',
                type: 'Reply'
            }
        },
        RemoveMembers: {
            TribeNotFound: {
                title: 'Tribe Not Found',
                description: 'The tribe was not found.',
                type: 'Reply'
            },
            MemberNotFound: {
                title: 'Member Not Found',
                description: 'The member was not found.',
                type: 'Reply'
            },
            CannotRemoveOwner: {
                title: 'Cannot Remove Owner',
                description: 'The owner of the tribe cannot be removed.',
                type: 'Reply'
            },
            MemberNotLinked: {
                title: 'Member Not Linked',
                description: 'The member is not linked to the tribe.',
                type: 'Reply'
            }
        },
        Info: {
            TribeNotFound: {
                title: 'Tribe Not Found',
                description: 'The tribe was not found.',
                type: 'Reply'
            }
        },
        Offences: {
            NoTribes: {
                title: 'No Tribes',
                description: 'No tribes found.',
                type: 'Reply'
            }
        },
        Warnings: {
            NoTribes: {
                title: 'No Tribes',
                description: 'No tribes found.',
                type: 'Reply'
            }
        },
        Configuration: {
            NoConfiguration: {
                title: 'No Configuration',
                description: 'No configuration found for this server. Run `/configuration setup` to set up the server.',
                type: 'Reply'
            },
            DailyReward: {
                InvalidAmount: {
                    title: 'Invalid Amount',
                    description: 'The amount must be greater than 0.',
                    type: 'Reply'
                },
                InvalidTimezone: {
                    title: 'Invalid Timezone',
                    description: 'Use a valid IANA timezone such as `UTC`, `America/New_York`, or `Europe/London`.',
                    type: 'Reply'
                },
                InvalidTime: {
                    title: 'Invalid Time',
                    description: 'Use 24-hour format like `09:30` or `18:00`.',
                    type: 'Reply'
                }
            },
            EditLog: {
                NoGuild: {
                    title: 'Server Only',
                    description: 'Use this command in a server.',
                    type: 'Reply'
                },
                InvalidDescription: {
                    title: 'Invalid Text',
                    description: 'Provide new log text between 1 and 4096 characters.',
                    type: 'Reply'
                },
                InvalidMessageId: {
                    title: 'Invalid Message ID',
                    description: 'Copy the numeric message ID from Discord (Developer Mode → Copy Message ID).',
                    type: 'Reply'
                },
                NoLogChannel: {
                    title: 'No Public Logs Channel',
                    description: 'Run `/configuration setup` and set the Alpha public logs channel first.',
                    type: 'Reply'
                },
                ChannelUnavailable: {
                    title: 'Logs Channel Unavailable',
                    description: 'The configured public logs channel could not be opened. Check channel permissions for the bot.',
                    type: 'Reply'
                },
                MessageNotFound: {
                    title: 'Message Not Found',
                    description: 'No message with that ID exists in your configured Alpha public logs channel.',
                    type: 'Reply'
                },
                NoEmbed: {
                    title: 'Not an Alpha Log Message',
                    description: 'That message has no embed; only Alpha public log posts can be edited here.',
                    type: 'Reply'
                },
                Unknown: {
                    title: 'Could Not Update',
                    description: 'Something went wrong while editing the message.',
                    type: 'Reply'
                },
            }
        }
    },
    Functions: {
        Alpha: {
            noAlphaAccess: {
                title: 'No Alpha Claims Access',
                description: 'You do not have permission to use this command.',
                type: 'Reply'
            }
        }
    },
    Events: {
        InteractionCreate: {
            cmdOnCooldown: {
                title: 'Command On Cooldown',
                description: '{cmdName} is on cooldown. Please wait {time} seconds before using it again.',
                type: 'Reply'
            },
            cmdDisabled: {
                title: 'Command Disabled',
                description: '{cmdName} is currently disabled.',
                type: 'Reply'
            },
            maintenanceMode: {
                title: 'Maintenance Mode',
                description: '{botName} is currently in maintenance mode and locked to our support servers only.',
                type: 'Reply'
            },
            noDeveloper: {
                title: 'No Developer',
                description: 'You are not a developer of {botName}.',
                type: 'Reply'
            },
            requiredUserPermissions: {
                title: 'Required Permissions',
                description: 'You must have the following permissions to execute this command: {permissions}',
                type: 'Reply'
            },
            requiredBotPermissions: {
                title: 'Required Permissions',
                description: 'The bot must have the following permissions to execute this command: {permissions}',
                type: 'Reply'
            }
        }
    }
};

const createEmbed = (interaction, title, description, options = {}) => {
    const client = interaction.client;
    const {
        author = null,
            color = client.modules.discord.Colors.Red,
            footer = client.footer,
            fields = [],
            components = [],
            logo = null,
            asCodeBlock = true
    } = options;
    if (description && asCodeBlock) {
        description = `\`\`\`${description}\`\`\``;
    }
    const embed = new client.modules.discord.EmbedBuilder()
        .setTitle(title)
        .setDescription(description || 'No description provided.')
        .setColor(options.color || color)
        .setFooter({
            text: footer
        });
    if (author) embed.setAuthor({
        name: author
    });
    if (logo) embed.setThumbnail(logo);
    if (fields.length > 0) embed.addFields(...fields);
    return {
        embed,
        components
    };
}

const send = async (interaction, type, args = {}) => {
    try {
        const client = interaction.client;
        let responseConfig;
        if (type.includes('.')) {
            const path = type.split('.');
            responseConfig = RESPONSES;
            for (const key of path) {
                responseConfig = responseConfig[key];
                if (!responseConfig) return;
            }
        } else {
            for (const category of Object.values(RESPONSES)) {
                if (category[type]) {
                    responseConfig = category[type];
                    break;
                }
            }
        }
        if (!responseConfig) return;
        const {
            title,
            components = []
        } = responseConfig;
        let description = responseConfig.description;
        if (description && args) {
            Object.entries(args).forEach(([key, value]) => {
                description = description.replace(`{${key}}`, value);
            });
        }
        const responseType = responseConfig.type || 'Reply';
        const RESPONSE_TYPES = getResponseTypes(client);
        const settings = {
            ...RESPONSE_TYPES[responseType],
            ...args,
            components: components,
            color: responseConfig.color || RESPONSE_TYPES[responseType].color
        };
        const {
            embed,
            components: finalComponents
        } = createEmbed(interaction, title, description, settings);
        const messageOptions = {
            embeds: [embed],
            components: finalComponents.length > 0 ? finalComponents : [],
            flags: settings.flags
        };
        switch (settings.sendMethod) {
            case 'FollowUp':
                return interaction.followUp(messageOptions);
            case 'Reply':
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply(messageOptions);
                }
                return interaction.reply(messageOptions);
            case 'Send':
                return interaction.channel.send(messageOptions);
            default:
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply(messageOptions);
                }
                return interaction.reply(messageOptions);
        }
    } catch (error) {
        return client.errors(client, error.stack, interaction);
    }
}

module.exports = async (type, interaction, args) => {
    return send(interaction, type, args);
};