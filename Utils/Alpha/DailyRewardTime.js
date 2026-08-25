const DATE_KEY_FORMATTER_CACHE = new Map();

const getDateKeyFormatter = (timeZone) => {
    const tz = timeZone || 'UTC';
    if (!DATE_KEY_FORMATTER_CACHE.has(tz)) {
        DATE_KEY_FORMATTER_CACHE.set(tz, new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }));
    }
    return DATE_KEY_FORMATTER_CACHE.get(tz);
};

const getLocalParts = (date, timeZone) => {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = Object.fromEntries(
        fmt.formatToParts(date).map((part) => [part.type, part.value])
    );
    return {
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        dateKey: `${parts.year}-${parts.month}-${parts.day}`
    };
};

const isValidTimeZone = (timeZone) => {
    if (!timeZone || typeof timeZone !== 'string') return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone });
        return true;
    } catch {
        return false;
    }
};

const DAILY_REWARD_TIMES = [];
for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute++) {
        DAILY_REWARD_TIMES.push(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        );
    }
}

const parsePartialTimeQuery = (digits) => {
    if (!/^\d{1,4}$/.test(digits)) return null;
    if (digits.length <= 2) {
        const hour = Number(digits);
        if (hour > 23) return null;
        return {
            hourPrefix: `${String(hour).padStart(2, '0')}:`
        };
    }
    if (digits.length === 3) {
        const hour = Number(digits[0]);
        const minute = Number(digits.slice(1));
        if (hour > 23 || minute > 59) return null;
        return {
            exact: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        };
    }
    const hour = Number(digits.slice(0, 2));
    const minute = Number(digits.slice(2));
    if (hour > 23 || minute > 59) return null;
    return {
        exact: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    };
};

const searchDailyRewardTimes = (query, limit = 25) => {
    const q = String(query ?? '').trim();
    if (!q) {
        return DAILY_REWARD_TIMES.filter((time) => time.endsWith(':00'));
    }
    const normalized = q.replace(/\s/g, '');
    const compactQuery = normalized.replace(':', '');
    if (!normalized.includes(':') && /^\d+$/.test(compactQuery)) {
        const partial = parsePartialTimeQuery(compactQuery);
        if (partial?.hourPrefix) {
            return DAILY_REWARD_TIMES
                .filter((time) => time.startsWith(partial.hourPrefix))
                .slice(0, limit);
        }
        if (partial?.exact) {
            const index = DAILY_REWARD_TIMES.indexOf(partial.exact);
            if (index === -1) return [];
            return DAILY_REWARD_TIMES.slice(index, index + limit);
        }
    }
    const matches = DAILY_REWARD_TIMES.filter((time) => {
        const compactTime = time.replace(':', '');
        return time.startsWith(normalized)
            || compactTime.startsWith(compactQuery)
            || time.includes(normalized);
    });
    return matches.slice(0, limit);
};

const parseDailyRewardTime = (raw) => {
    const trimmed = String(raw ?? '').trim();
    const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const isSameCalendarDayInZone = (dateA, dateB, timeZone) => {
    if (!dateA || !dateB) return false;
    const formatter = getDateKeyFormatter(timeZone);
    return formatter.format(dateA) === formatter.format(dateB);
};

module.exports = {
    DAILY_REWARD_TIMES,
    getLocalParts,
    isValidTimeZone,
    parseDailyRewardTime,
    searchDailyRewardTimes,
    isSameCalendarDayInZone
};
