const INSIGNIFICANT_REASON = new Set(['—', '–', '-', 'n/a', 'na', 'none']);

/**
 * True when the user entered real context (not empty / placeholder).
 */
const isSignificantReason = (text) => {
    if (text == null) return false;
    const t = String(text).trim();
    if (!t) return false;
    return !INSIGNIFICANT_REASON.has(t.toLowerCase());
};

module.exports = {
    isSignificantReason
};
