const {
    getWarningPolicy
} = require('./OffencePolicy');

const MANUAL_REASON = {
    key: 'manual-adjustment',
    label: 'Manual Adjustment'
};

const getReasonChoices = async (client, guildId) => {
    const policy = await getWarningPolicy(client, guildId);
    const dynamicReasons = Object.entries(policy.offenceTypes).map(([key, value]) => ({
        key,
        label: value.label
    }));
    return [...dynamicReasons, MANUAL_REASON];
};

const resolveReasonConfig = async (client, guildId, reasonKey) => {
    if (reasonKey === MANUAL_REASON.key) {
        return {
            ...MANUAL_REASON,
            deduction: null,
            countTowardWarning: false,
            isManual: true
        };
    }
    const policy = await getWarningPolicy(client, guildId);
    const type = policy.offenceTypes[reasonKey];
    if (!type) return null;
    return {
        key: reasonKey,
        label: type.label,
        deduction: type.deduction,
        countTowardWarning: type.countTowardWarning,
        isManual: false
    };
};

module.exports = {
    getReasonChoices,
    resolveReasonConfig
};
