const WARNING_ACTION_LABELS = {
    'warning-1': 'First warning issued',
    'warning-2': 'Second warning issued',
    'warning-3': 'Third warning issued',
    'warning-4': 'Fourth warning issued + Dino wipe',
    'claim-removed': 'Claim removed and points reset to 0'
};

const formatPolicyActionLabel = (action) => WARNING_ACTION_LABELS[action] || null;

const buildPolicyResultNotes = (policyResult, reasonLabel, baseDeduction, formatAlphaPoints) => {
    if (!policyResult) return [];
    const notes = [`Offence #: ${policyResult.offenceCount}`];
    if (policyResult.percentageAmount > 0) {
        notes.push(`Balance deduction: ${formatAlphaPoints(policyResult.percentageAmount)} points`);
    }
    const actionLabel = formatPolicyActionLabel(policyResult.action);
    if (actionLabel) notes.push(actionLabel);
    if (reasonLabel) {
        notes.push(`${reasonLabel}: ${formatAlphaPoints(baseDeduction)} points`);
    }
    return notes;
};

module.exports = {
    formatPolicyActionLabel,
    buildPolicyResultNotes
};
