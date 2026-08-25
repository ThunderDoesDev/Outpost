const {
    hasAlphaAccess,
    replyNoAlphaAccess
} = require('../../Utils/Alpha/Permissions');
const {
    getWarningPolicy,
    getPolicyAction
} = require('../../Utils/Alpha/OffencePolicy');
const { formatAlphaPoints } = require('../../Utils/Alpha/PointsDisplay');
const { isSameCalendarDayInZone } = require('../../Utils/Alpha/DailyRewardTime');
const { formatDailyRewardStatus } = require('../../Utils/Alpha/DailyRewardScheduler');

const formatPolicyAction = (offenceNumber, policy) => {
    const actionState = getPolicyAction(offenceNumber, policy);
    if (actionState.action === 'claim-removed') {
        return 'Claim removed and points reset to 0';
    }
    if (actionState.action.startsWith('warning-')) {
        return `Warning ${actionState.warningLevel} triggered`;
    }
    return 'Standard offence penalty';
};

module.exports = {
    name: 'policy',
    description: 'View a tribe policy status.',
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
        name: 'tribe',
        description: 'Tribe name',
        type: 3,
        required: true,
        autocomplete: true
    }],
    run: async (client, interaction) => {
        try {
            if (!(await hasAlphaAccess(client, interaction))) {
                return replyNoAlphaAccess(client, interaction);
            }
            const tribeName = interaction.options.getString('tribe');
            const tribe = await client.database.models.AlphaTribe.findByNameOrId(interaction.guild.id, tribeName);
            if (!tribe) {
                return client.responses('Commands.Tribe.InvalidTribeName', interaction);
            }
            const offenceCount = Number(tribe.offence_count || 0);
            const warningLevel = Number(tribe.warning_level || 0);
            const nextOffenceNumber = offenceCount + 1;
            const warningPolicy = await getWarningPolicy(client, interaction.guild.id);
            const guildConfig = await client.database.models.GuildConfig.findOne(interaction.guild.id);
            const rewardTimeZone = guildConfig?.daily_reward_timezone || 'UTC';
            const claimedToday = Boolean(
                tribe.last_daily_reward_at
                && isSameCalendarDayInZone(
                    new Date(tribe.last_daily_reward_at),
                    new Date(),
                    rewardTimeZone
                )
            );
            const dailyRewardAmount = guildConfig?.daily_reward_amount || 1;
            const dailyRewardStatus = claimedToday
                ? 'Already claimed today'
                : `Available (+${formatAlphaPoints(dailyRewardAmount)})`;
            const autoDailyRewardStatus = formatDailyRewardStatus(guildConfig);
            const nextOffenceNumberStatus = nextOffenceNumber >= warningPolicy.claimRemovalOffence ? 'Claim removed and points reset to 0' : `Next Offence (#${nextOffenceNumber})`;
            const warningLevelStatus = `${warningLevel}/${warningPolicy.maxWarnings}`;
            const nextPolicyActionStatus = formatPolicyAction(nextOffenceNumber, warningPolicy);
            const warningConfigStatus = `Thresholds: ${warningPolicy.warningThresholds.join(', ')} | Remove claim at: ${warningPolicy.claimRemovalOffence}`;
            const warningTypesStatus = Object.values(warningPolicy.offenceTypes)
                .slice(0, 6)
                .map((type) => `${type.label} (-${type.deduction})`)
                .join('\n');
            const policyStatusEmbed = new client.modules.discord.EmbedBuilder()
                .setColor(client.settings.bot.embedColor)
                .setTitle(`${client.user.username} - Tribe Policy Status`)
                .addFields(
                    { name: 'Tribe Name:', value: tribe.tribe_name },
                    { name: 'Points:', value: formatAlphaPoints(tribe.points) },
                    { name: 'Offence Count:', value: `${offenceCount}` },
                    { name: 'Warning Level:', value: `${warningLevelStatus}` },
                    { name: 'Warning Config:', value: warningConfigStatus },
                    { name: 'Daily Reward:', value: `${dailyRewardStatus}` },
                    { name: 'Auto Daily Reward:', value: autoDailyRewardStatus },
                    { name: 'Next Offence:', value: `${nextOffenceNumberStatus}` },
                    { name: 'Next Policy Action:', value: `${nextPolicyActionStatus}` },
                    { name: 'Warning Types (Top 6):', value: warningTypesStatus || 'No warning types configured.' }
                )
                .setThumbnail(client.user.displayAvatarURL(
                    { dynamic: true }
                ))
                .setFooter({
                    text: client.footer
                })
                .setTimestamp();
            return interaction.reply({
                embeds: [policyStatusEmbed]
            });
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    },
    autocomplete: async (client, interaction) => {
        try {
            const focusedOption = interaction.options.getFocused(true);
            if (!focusedOption || focusedOption.name !== 'tribe') {
                return interaction.respond([]);
            }
            const tribes = await client.database.models.AlphaTribe.findAll(interaction.guild.id);
            if (!tribes || tribes.length === 0) {
                return interaction.respond([{
                    name: 'No Tribes Found',
                    value: 'no_tribes'
                }]);
            }
            const focusedValue = String(focusedOption.value || '').toLowerCase();
            const options = tribes
                .filter((tribe) => String(tribe.tribe_name || '').toLowerCase().includes(focusedValue))
                .slice(0, 25)
                .map((tribe) => ({
                    name: tribe.tribe_name,
                    value: tribe.tribe_name
                }));
            return interaction.respond(options.length ? options : [{
                name: 'No Matches Found',
                value: 'no_matches'
            }]);
        } catch (error) {
            return client.errors(client, error.stack, interaction, 'Command');
        }
    }
};
