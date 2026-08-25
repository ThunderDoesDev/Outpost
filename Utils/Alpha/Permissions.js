const { PermissionFlagsBits } = require('discord.js');

const hasAlphaAccess = async (client, interaction) => {
    const member = interaction.member;
    if (!member || !interaction.guild) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
        return true;
    }
    const memberRoles = member.roles?.cache;
    if (!memberRoles) return false;
    try {
        const config = await client.database?.models?.GuildConfig?.findOne(interaction.guild.id);
        const managerRoleId = config?.manager_role_id;
        if (managerRoleId && memberRoles.has(managerRoleId)) {
            return true;
        }
    } catch {

    }
    return false;
};

const replyNoAlphaAccess = (client, interaction) => {
    return client.responses('Functions.Alpha.noAlphaAccess', interaction);
};

module.exports = {
    hasAlphaAccess,
    replyNoAlphaAccess
};
