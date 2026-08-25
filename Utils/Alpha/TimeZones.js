const IANA_TIME_ZONES = Intl.supportedValuesOf('timeZone');

const searchTimeZones = (query, limit = 25) => {
    const q = String(query ?? '').trim().toLowerCase();
    let matches = q
        ? IANA_TIME_ZONES.filter((tz) => tz.toLowerCase().includes(q))
        : ['UTC', ...IANA_TIME_ZONES.filter((tz) => tz !== 'UTC')];
    return matches.slice(0, limit);
};

module.exports = {
    IANA_TIME_ZONES,
    searchTimeZones
};
