async function createPagination({
    client,
    items,
    itemsPerPage,
    embedGenerator,
    interaction,
    timeout = 100000,
    ephemeral = false,
    startPage = 1,
    emptyOptions
}) {
    if (!emptyOptions) {
        emptyOptions = {
            color: client.modules.discord.Colors.Red,
            title: 'No Items',
            description: 'No items to display.'
        };
    }
    if (!Array.isArray(items) || items.length === 0) {
        const emptyEmbed = new client.modules.discord.EmbedBuilder()
            .setColor(emptyOptions.color)
            .setTitle(emptyOptions.title)
            .setDescription(emptyOptions.description);
        return interaction.reply({
            embeds: [emptyEmbed],
            flags: ephemeral ? client.modules.discord.MessageFlags.Ephemeral : 0
        });
    }
    const totalPages = Math.ceil(items.length / itemsPerPage);
    let currentPage = Math.max(1, Math.min(startPage, totalPages));
    let lastEmbedData;
    const generateMenuOptions = (page) => {
        const maxOptions = 25;
        let start = Math.max(1, page - Math.floor(maxOptions / 2));
        let end = start + maxOptions - 1;
        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - maxOptions + 1);
        }
        const options = [];
        for (let i = start; i <= end; i++) {
            options.push({
                label: `Page ${i}`,
                value: `${i}`,
                description: i === page ? `Current page: ${i}` : `Go to page ${i}`,
                default: i === page
            });
        }
        return options;
    };
    const getPageData = (page) => {
        const start = (page - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    };
    const getButtonRow = (page) => {
        const atStart = page <= 1;
        const atEnd = page >= totalPages;
        return new client.modules.discord.ActionRowBuilder().addComponents(
            new client.modules.discord.ButtonBuilder()
            .setCustomId('fastBack')
            .setLabel('⏪')
            .setStyle(client.modules.discord.ButtonStyle.Secondary)
            .setDisabled(atStart),
            new client.modules.discord.ButtonBuilder()
            .setCustomId('back')
            .setLabel('⬅️')
            .setStyle(client.modules.discord.ButtonStyle.Primary)
            .setDisabled(atStart),
            new client.modules.discord.ButtonBuilder()
            .setCustomId('forward')
            .setLabel('➡️')
            .setStyle(client.modules.discord.ButtonStyle.Primary)
            .setDisabled(atEnd),
            new client.modules.discord.ButtonBuilder()
            .setCustomId('fastForward')
            .setLabel('⏩')
            .setStyle(client.modules.discord.ButtonStyle.Secondary)
            .setDisabled(atEnd),
            new client.modules.discord.ButtonBuilder()
            .setCustomId('delete')
            .setLabel('🗑️')
            .setStyle(client.modules.discord.ButtonStyle.Danger)
            .setDisabled(ephemeral === true)
        );
    };
    const buildEmbed = (data) => {
        const embed = new client.modules.discord.EmbedBuilder();
        if (data.color) embed.setColor(data.color);
        if (data.title) embed.setTitle(data.title);
        if (data.description) embed.setDescription(data.description);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.footer && data.footer.text) {
            embed.setFooter({
                text: data.footer.text
            });
        }
        return embed;
    };
    const sendPagination = async () => {
        const pageData = getPageData(currentPage);
        lastEmbedData = embedGenerator(pageData, currentPage, totalPages);
        const embed = buildEmbed(lastEmbedData);
        const menuRow = new client.modules.discord.ActionRowBuilder().addComponents(
            new client.modules.discord.StringSelectMenuBuilder()
            .setCustomId('selectPage')
            .setPlaceholder(`Page ${currentPage}`)
            .addOptions(generateMenuOptions(currentPage))
        );
        const buttonRow = getButtonRow(currentPage);
        await interaction.reply({
            embeds: [embed],
            components: [menuRow, buttonRow],
            flags: ephemeral ? client.modules.discord.MessageFlags.Ephemeral : 0
        });
        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: timeout
        });
        collector.on('collect', async (i) => {
            if (i.isButton()) {
                switch (i.customId) {
                    case 'back':
                        currentPage = Math.max(1, currentPage - 1);
                        break;
                    case 'forward':
                        currentPage = Math.min(totalPages, currentPage + 1);
                        break;
                    case 'fastBack':
                        currentPage = Math.max(1, currentPage - 5);
                        break;
                    case 'fastForward':
                        currentPage = Math.min(totalPages, currentPage + 5);
                        break;
                    case 'delete':
                        if (!ephemeral) await i.message.delete().catch(() => {});
                        return;
                }
            } else if (i.isStringSelectMenu()) {
                currentPage = parseInt(i.values[0], 10);
            }
            const newData = getPageData(currentPage);
            lastEmbedData = embedGenerator(newData, currentPage, totalPages);
            await i.update({
                embeds: [buildEmbed(lastEmbedData)],
                components: [
                    new client.modules.discord.ActionRowBuilder().addComponents(
                        new client.modules.discord.StringSelectMenuBuilder()
                        .setCustomId('selectPage')
                        .setPlaceholder(`Page ${currentPage}`)
                        .addOptions(generateMenuOptions(currentPage))
                    ),
                    getButtonRow(currentPage)
                ]
            });
        });
        collector.on('end', async () => {
            const disabledMenuRow = new client.modules.discord.ActionRowBuilder().addComponents(
                new client.modules.discord.StringSelectMenuBuilder()
                .setCustomId('selectPage')
                .setPlaceholder(`Page ${currentPage}`)
                .addOptions(generateMenuOptions(currentPage))
                .setDisabled(true)
            );
            const disabledButtonRow = new client.modules.discord.ActionRowBuilder().addComponents(
                new client.modules.discord.ButtonBuilder().setCustomId('fastBack').setLabel('⏪').setStyle(client.modules.discord.ButtonStyle.Secondary).setDisabled(true),
                new client.modules.discord.ButtonBuilder().setCustomId('back').setLabel('⬅️').setStyle(client.modules.discord.ButtonStyle.Primary).setDisabled(true),
                new client.modules.discord.ButtonBuilder().setCustomId('forward').setLabel('➡️').setStyle(client.modules.discord.ButtonStyle.Primary).setDisabled(true),
                new client.modules.discord.ButtonBuilder().setCustomId('fastForward').setLabel('⏩').setStyle(client.modules.discord.ButtonStyle.Secondary).setDisabled(true),
                new client.modules.discord.ButtonBuilder().setCustomId('delete').setLabel('🗑️').setStyle(client.modules.discord.ButtonStyle.Danger).setDisabled(true)
            );
            const disabledEmbed = buildEmbed(lastEmbedData);
            if (ephemeral) {
                await interaction.editReply({
                    embeds: [disabledEmbed],
                    components: [disabledMenuRow, disabledButtonRow]
                });
            } else {
                const fetched = await interaction.channel.messages.fetch(message.id).catch(() => null);
                if (fetched) {
                    await fetched.edit({
                        embeds: [disabledEmbed],
                        components: [disabledMenuRow, disabledButtonRow]
                    });
                }
            }
        });
    };
    await sendPagination();
}


module.exports = {
    createPagination
};