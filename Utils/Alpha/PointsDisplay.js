/**
 * Display math uses cent precision (SCALE).
 * DB column `alpha_tribes.points` stores INT hundredths (e.g. 3600 = 36 points, 2850 = 28.5).
 */

const SCALE = 100;

const normalizeAlphaPoints = (value) => {
    if (value === null || value === undefined) return 0;
    const raw = typeof value === 'string' ? value.trim() : value;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * SCALE) / SCALE;
};

const pointsValuesEqual = (a, b) => normalizeAlphaPoints(a) === normalizeAlphaPoints(b);

/**
 * Human display: 36 → "36", 28.5 → "28.5" (never "36.00" / "28.50").
 * Built from integer cents so output never depends on float toString / DECIMAL strings.
 */
const formatAlphaPoints = (value) => {
    const n = normalizeAlphaPoints(value);
    if (!Number.isFinite(n)) return '0';
    const cents = Math.round(n * SCALE);
    const whole = Math.trunc(cents / SCALE);
    const frac = cents % SCALE;
    if (frac === 0) return String(whole);
    const fracDigits = String(frac).padStart(2, '0').replace(/0+$/, '');
    return `${whole}.${fracDigits}`;
};

const storedToDisplayPoints = (stored) => {
    const n = Number(stored);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n) / SCALE;
};

/**
 * Writes DB INT hundredths without float drift (e.g. 28.5 → 2850, never 2849/2900).
 * Do not run SQL like SET points = 28.5 on an INT column — MySQL rounds to 29; use 2850.
 */
const displayToStoredHundredths = (display) => {
    const n = normalizeAlphaPoints(display);
    if (!Number.isFinite(n)) return 0;
    const fixed = n.toFixed(2);
    const parts = fixed.split('.');
    const whole = parseInt(parts[0], 10) || 0;
    const frac = parts[1] ? parseInt(parts[1].slice(0, 2).padEnd(2, '0'), 10) : 0;
    return whole * SCALE + frac;
};

module.exports = {
    normalizeAlphaPoints,
    pointsValuesEqual,
    formatAlphaPoints,
    storedToDisplayPoints,
    displayToStoredHundredths
};
