const {
    parseDailyRewardTime,
    isValidTimeZone,
    searchDailyRewardTimes
} = require('../../Utils/Alpha/DailyRewardTime');
const {
    DAILY_REWARD_DEFAULT_AMOUNT
} = require('../../Utils/Alpha/PointDefaults');
const {
    formatAlphaPoints
} = require('../../Utils/Alpha/PointsDisplay');
const {
    formatDailyRewardStatus
} = require('../../Utils/Alpha/DailyRewardScheduler');
const {
    searchTimeZones
} = require('../../Utils/Alpha/TimeZones');

module.exports = {
name: 'daily-reward',
description: 'Configure automatic daily reward points for all active tribes.',
cooldowns: 3,
usage: [],
disabled: false,
permissions: {
    client: [],
    user: ['ManageGuild'],
    staff: {
        developers: false
    }
},
options: [{
    name: 'action',
    description: 'Action to perform.',
    type: 3,
    required: true,
    choices: [{
        name: 'Enable',
        value: 'enable'
    }, {
        name: 'Disable',
        value: 'disable'
    }, {
        name: 'Status',
        value: 'status'
    }]
},
{
    name: 'time',
    description: 'Time to send the daily reward.',
    type: 3,
    required: false,
    autocomplete: true
},
{
    name: 'timezone',
    description: 'Timezone to send the daily reward.',
    type: 3,
    required: false,
    autocomplete: true
},
{
    name: 'amount',
    description: 'Amount of points to reward.',
    type: 4,
    required: false
}],
run: async (client, interaction) => {
    try {
        const action = interaction.options.getString('action');
        const time = interaction.options.getString('time');
        const timeZone = interaction.options.getString('timezone');
        const points = interaction.options.getInteger('amount') ? interaction.options.getInteger('amount') : DAILY_REWARD_DEFAULT_AMOUNT;
        if (!Number.isInteger(points) || points < 1) {
            return client.responses('Commands.Points.InvalidAmount', interaction);
        }
        const guildConfig = await client.database.models.GuildConfig.findOne(interaction.guild.id);
        switch (action) {
            case 'status': {
                const statusEmbed = new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Daily Reward`)
                    .setDescription(formatDailyRewardStatus(guildConfig))
                    .setFooter({
                        text: client.footer
                    })
                    .setTimestamp();
                return interaction.reply({
                    embeds: [statusEmbed]
                });
            }
            case 'disable': {
                await client.database.models.GuildConfig.disableDailyReward(interaction.guild.id);
                const disabledEmbed = new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Daily Reward`)
                    .setDescription('Automatic daily rewards are now disabled.')
                    .setFooter({
                        text: client.footer
                    })
                    .setTimestamp();
                return interaction.reply({
                    embeds: [disabledEmbed]
                });
            }
            case 'enable': {
                const parsedTime = parseDailyRewardTime(time);
                if (!parsedTime) {
                   return client.responses('Commands.Configuration.DailyReward.InvalidTime', interaction);
                }
                const timezone = timeZone ? timeZone.trim() : 'UTC';
                if (!isValidTimeZone(timezone)) {
                    return client.responses('Commands.Configuration.DailyReward.InvalidTimezone', interaction);
                }
                const amount = points ? points : DAILY_REWARD_DEFAULT_AMOUNT;
                if (!Number.isInteger(amount) || amount < 1) {
                    return client.responses('Commands.Configuration.DailyReward.InvalidAmount', interaction);
                }
                if (!guildConfig) {
                    return client.responses('Commands.Configuration.NoConfiguration', interaction);
                }
                await client.database.models.GuildConfig.upsertDailyReward(interaction.guild.id, {
                    enabled: 1,
                    time: parsedTime,
                    timezone,
                    amount
                });
                const enabledEmbed = new client.modules.discord.EmbedBuilder()
                    .setColor(client.settings.bot.embedColor)
                    .setTitle(`${client.user.username} - Daily Reward`)
                    .setDescription(`Automatic daily rewards are enabled at ${parsedTime} ${timezone} with a reward of ${formatAlphaPoints(amount)}.`)
                    .setFooter({
                        text: client.footer
                    })
                    .setTimestamp();
                return interaction.reply({
                    embeds: [enabledEmbed],
                    flags: client.modules.discord.MessageFlags.Ephemeral
                });
            }
        }
    } catch (error) {
        return client.errors(client, error.stack, interaction, 'Command');
    }
},
autocomplete: async (client, interaction) => {
    try {
        const focusedOption = interaction.options.getFocused(true);
        if (!focusedOption) {
            return interaction.respond([]);
        }
        let matches = [];
        if (focusedOption.name === 'time') {
            matches = searchDailyRewardTimes(focusedOption.value);
        } else if (focusedOption.name === 'timezone') {
            matches = searchTimeZones(focusedOption.value);
        } else {
            return interaction.respond([]);
        }
        if (matches.length === 0) {
            return interaction.respond([{
                name: 'No Matches Found',
                value: 'no_matches'
            }]);
        }
        return interaction.respond(
            matches.map((value) => ({
                name: value,
                value
            }))
        );
    } catch (error) {
        return client.errors(client, error.stack, interaction, 'Command');
    }
  }
};