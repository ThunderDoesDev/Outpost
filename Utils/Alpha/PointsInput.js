const { normalizeAlphaPoints } = require('./PointsDisplay');
const { isTribeAutocompletePlaceholder } = require('./TribeAutocomplete');

const parsePointsAmount = (raw) => {
    const normalized = raw != null ? String(raw).trim().replace(',', '.') : '';
    if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
        return { ok: false, value: 0 };
    }
    const value = normalizeAlphaPoints(parseFloat(normalized));
    if (value <= 0) {
        return { ok: false, value: 0 };
    }
    return { ok: true, value };
};

const resolveTribeRecord = async (client, guildId, raw) => {
    if (isTribeAutocompletePlaceholder(raw)) return null;
    return client.database.models.AlphaTribe.findByNameOrId(guildId, raw);
};

const resolveOtherTribeName = async (client, guildId, raw, tribe) => {
    if (isTribeAutocompletePlaceholder(raw)) {
        return { ok: true, name: null };
    }
    const otherTribe = await client.database.models.AlphaTribe.findByNameOrId(guildId, raw);
    if (!otherTribe) {
        return { ok: false, responseKey: 'Commands.Points.InvalidOtherTribe' };
    }
    if (String(otherTribe.tribe_name).toLowerCase() === String(tribe.tribe_name).toLowerCase()) {
        return { ok: false, responseKey: 'Commands.Points.OtherTribeCannotBeTheSame' };
    }
    return { ok: true, name: otherTribe.tribe_name };
};

const RAID_TYPES = new Set(['raided-online', 'raided-offline']);

module.exports = {
    parsePointsAmount,
    resolveTribeRecord,
    resolveOtherTribeName,
    RAID_TYPES
};
