const DEFAULT_WARNING_POLICY = {
    maxWarnings: 4,
    warningThresholds: [3, 6, 9, 10],
    claimRemovalOffence: 11,
    offenceTypes: {
        'offline-mesh-bite': {
            label: 'Offline Mesh Bite',
            deduction: 1,
            countTowardWarning: true
        },
        'online-mesh-bite': {
            label: 'Online Mesh Bite',
            deduction: 1,
            countTowardWarning: true
        },
        'cheater-in-tribe': {
            label: 'Cheater in Tribe',
            deduction: 1,
            countTowardWarning: true
        },
        'tribe-name-mismatch': {
            label: 'Tribe Name Mismatch',
            deduction: 1,
            countTowardWarning: true
        },
        'players-not-registered': {
            label: 'Players Not Registered',
            deduction: 1,
            countTowardWarning: true
        },
        'mesh-raiding': {
            label: 'Mesh Raiding',
            deduction: 10,
            countTowardWarning: true
        },
        'too-many-tames-at-custom-cave-edit': {
            label: 'Too Many Tames At Custom Cave Edit',
            deduction: 1,
            countTowardWarning: true
        },
        'other-offence': {
            label: 'Other Offence',
            deduction: 1,
            countTowardWarning: true
        }
    }
};

const toPositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const sanitizePolicy = (rawPolicy = {}) => {
    const thresholds = Array.isArray(rawPolicy.warningThresholds)
        ? rawPolicy.warningThresholds.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value) && value > 0)
        : [];
    const uniqueSortedThresholds = [...new Set(thresholds)].sort((a, b) => a - b);
    const warningThresholds = uniqueSortedThresholds.length
        ? uniqueSortedThresholds
        : DEFAULT_WARNING_POLICY.warningThresholds;
    const maxWarnings = toPositiveInteger(rawPolicy.maxWarnings, warningThresholds.length || DEFAULT_WARNING_POLICY.maxWarnings);
    const claimRemovalOffence = toPositiveInteger(
        rawPolicy.claimRemovalOffence,
        Math.max(...warningThresholds, DEFAULT_WARNING_POLICY.claimRemovalOffence)
    );
    const sourceTypes = rawPolicy.offenceTypes && typeof rawPolicy.offenceTypes === 'object'
        ? rawPolicy.offenceTypes
        : DEFAULT_WARNING_POLICY.offenceTypes;
    const offenceTypes = {};
    Object.entries(sourceTypes).forEach(([key, config]) => {
        if (!key || typeof config !== 'object') return;
        offenceTypes[key] = {
            label: String(config.label || key),
            deduction: toPositiveInteger(config.deduction, 1),
            countTowardWarning: Boolean(config.countTowardWarning)
        };
    });
    return {
        maxWarnings,
        warningThresholds,
        claimRemovalOffence,
        offenceTypes
    };
};

const getWarningLevel = (offenceCount, policy) => {
    const reachedThresholds = policy.warningThresholds.filter((threshold) => offenceCount >= threshold);
    return Math.min(reachedThresholds.length, policy.maxWarnings);
};

const getPolicyAction = (offenceCount, policy) => {
    const warningLevel = getWarningLevel(offenceCount, policy);
    if (offenceCount >= policy.claimRemovalOffence) {
        return {
            action: 'claim-removed',
            warningLevel
        };
    }
    const matchedThresholdIndex = policy.warningThresholds.findIndex((threshold) => threshold === offenceCount);
    if (matchedThresholdIndex !== -1) {
        const triggeredLevel = Math.min(matchedThresholdIndex + 1, policy.maxWarnings);
        return {
            action: `warning-${triggeredLevel}`,
            warningLevel
        };
    }
    return {
        action: 'none',
        warningLevel
    };
};

const getBasePolicy = (client) => sanitizePolicy(client?.settings?.alphaWarningPolicy || DEFAULT_WARNING_POLICY);

const getWarningPolicy = async (client, guildId) => {
    const basePolicy = getBasePolicy(client);
    if (!guildId || !client?.database?.models?.GuildConfig?.getWarningPolicy) {
        return basePolicy;
    }
    const guildPolicy = await client.database.models.GuildConfig.getWarningPolicy(guildId);
    if (!guildPolicy) return basePolicy;
    return sanitizePolicy({
        ...basePolicy,
        ...guildPolicy,
        offenceTypes: {
            ...basePolicy.offenceTypes,
            ...(guildPolicy.offenceTypes || {})
        }
    });
};

module.exports = {
    DEFAULT_WARNING_POLICY,
    sanitizePolicy,
    getBasePolicy,
    getWarningPolicy,
    getWarningLevel,
    getPolicyAction
};
