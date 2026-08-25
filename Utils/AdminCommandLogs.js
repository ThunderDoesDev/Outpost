const {
    ApplicationCommandOptionType
} = require('discord.js');

/** Slash command folders allowed to post to the admin command log channel */
const ADMIN_LOG_CATEGORIES = new Set(['members', 'offences', 'points', 'tribe', 'warnings']);

const formatLeafOption = (interaction, opt) => {
    const name = opt.name;
    switch (opt.type) {
        case ApplicationCommandOptionType.String:
        case ApplicationCommandOptionType.Integer:
        case ApplicationCommandOptionType.Number:
        case ApplicationCommandOptionType.Boolean:
            return `**${name}:** ${opt.value}`;
        case ApplicationCommandOptionType.User: {
            const u = interaction.options.getUser(name);
            return `**${name}:** ${u ? `${u.tag} (${u.id})` : String(opt.value)}`;
        }
        case ApplicationCommandOptionType.Channel: {
            const ch = interaction.options.getChannel(name);
            return `**${name}:** ${ch ? `<#${ch.id}>` : String(opt.value)}`;
        }
        case ApplicationCommandOptionType.Role: {
            const r = interaction.options.getRole(name);
            return `**${name}:** ${r ? `<@&${r.id}>` : String(opt.value)}`;
        }
        case ApplicationCommandOptionType.Mentionable: {
            const m = interaction.options.getMentionable(name);
            if (!m) return `**${name}:** —`;
            if (m.user) return `**${name}:** ${m.user.tag} (${m.user.id})`;
            if (m.username != null) return `**${name}:** ${m.tag} (${m.id})`;
            return `**${name}:** <@&${m.id}> (${m.name || m.id})`;
        }
        case ApplicationCommandOptionType.Attachment: {
            const a = interaction.options.getAttachment(name);
            return `**${name}:** ${a ? `${a.name} (${a.url})` : '—'}`;
        }
        default:
            return `**${name}:** ${opt.value != null ? opt.value : '—'}`;
    }
};

const collectFormattedOptions = (interaction, options) => {
    const lines = [];
    const walk = (opts) => {
        if (!opts || !opts.length) return;
        for (const opt of opts) {
            if (
                opt.type === ApplicationCommandOptionType.Subcommand ||
                opt.type === ApplicationCommandOptionType.SubcommandGroup
            ) {
                walk(opt.options);
            } else {
                lines.push(formatLeafOption(interaction, opt));
            }
        }
    };
    walk(options);
    return lines.join('\n') || '—';
};

const buildInvocationLabel = (interaction, subCmd, subCmdGroup) => {
    let label = `/${interaction.commandName}`;
    if (subCmdGroup) label += ` ${subCmdGroup}`;
    if (subCmd) label += ` ${subCmd}`;
    return label;
};

const postAdminCommandLog = async (client, interaction, {
    subCmd,
    subCmdGroup,
    cmd
}) => {
    try {
        if (!interaction.guild || !interaction.channel) return null;    
        const categoryKey = cmd ? cmd.category ? cmd.category.toLowerCase() : '' : '';
        if (!categoryKey || !ADMIN_LOG_CATEGORIES.has(categoryKey)) return null;
        const guildConfig = await client.database.models.GuildConfig.findOne(interaction.guild.id);
        const channelId = guildConfig ? guildConfig.admin_command_logs_channel_id : null;
        if (!channelId) return null;
        const logChannel = await interaction.guild.channels.fetch(channelId).catch(async () => {
            return client.channels.fetch(channelId).catch(() => null);
        });
        if (!logChannel || !logChannel.isTextBased()) return null;
        if (typeof logChannel.isSendable === 'function' && !logChannel.isSendable()) return null;
        const invocation = buildInvocationLabel(interaction, subCmd, subCmdGroup);
        const optionsBlock = collectFormattedOptions(interaction, interaction.options ? interaction.options.data : []);
        const embed = new client.modules.discord.EmbedBuilder()
            .setTitle(`${interaction.guild.name} • Command Used`)
            .setDescription(`${interaction.user.tag} (<@${interaction.user.id}>) used the command \`${invocation}\`${cmd?.name ? ` (\`${cmd.name}\`)` : ''}`)
            .setColor(client.settings.bot.embedColor)
            .addFields(
                { name: 'Options', value: optionsBlock.length > 1024 ? `${optionsBlock.slice(0, 1021)}...` : optionsBlock }
            )
            .setThumbnail(interaction.user.displayAvatarURL({
                dynamic: true
            }))
            .setFooter({
                text: client.footer
            })
            .setTimestamp();
        return await logChannel.send({
            embeds: [embed]
        });
    } catch (error) {
        client.errors(client, error ? error.stack || error : new Error('Unknown error'), interaction, 'Event');
        return null;
    }
};

module.exports = {
    postAdminCommandLog
};