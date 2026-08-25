const VALID_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

const isImageAttachment = (attachment) => {
    if (!attachment || !attachment.name) return false;
    const fileExtension = attachment.name.split('.').pop()?.toLowerCase();
    return VALID_EXTENSIONS.includes(fileExtension);
};

const getNextPhotoOrder = async (client, guildId, tribeName) => {
    return client.database.models.AlphaTribePhoto.getNextOrder(guildId, tribeName);
};

const saveStarterThreadPhotos = async (client, interaction, tribe, thread, starterMessage, photos) => {
    const postedPhotos = [];
    let nextOrder = await getNextPhotoOrder(client, interaction.guild.id, tribe.tribe_name);
    if (!photos.length) {
        return postedPhotos;
    }
    const sentAttachments = Array.from(starterMessage?.attachments?.values?.() || []);
    for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const finalAttachment = sentAttachments[index];
        const saved = await client.database.models.AlphaTribePhoto.create({
            guild_id: interaction.guild.id,
            tribe_name: tribe.tribe_name,
            thread_id: thread.id,
            message_id: null,
            uploaded_by: interaction.user.id,
            image_url: finalAttachment?.url || photo.url,
            file_name: photo.name || null,
            caption: photo.caption || null,
            photo_order: nextOrder
        });
        postedPhotos.push(saved);
        nextOrder += 1;
    }
    return postedPhotos;
};

const removeTribePhoto = async (client, guild, tribe, photoRecord) => {
    try {
        const thread = await guild.channels.fetch(photoRecord.thread_id).catch(() => null);
        if (thread && thread.isThread() && photoRecord.message_id) {
            const photoMessage = await thread.messages.fetch(photoRecord.message_id).catch(() => null);
            if (photoMessage) {
                await photoMessage.delete().catch(() => null);
            }
        }
    } catch (error) {
        console.error('[AlphaPhotoUtils] Failed to delete Discord photo message:', error);
    }
    await client.database.models.AlphaTribePhoto.removeById(guild.id, photoRecord.id);
};

module.exports = {
    isImageAttachment,
    getNextPhotoOrder,
    saveStarterThreadPhotos,
    removeTribePhoto
};
