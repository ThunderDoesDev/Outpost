const ALPHA_MAP_CHOICES = [
    'Scorched Earth 6man',
    'Gen 1 6man',
    'Gen 2 6man',
    'Center 6man',
    'Ragnarok 6man',
    'Extinction 6man',
    'Aberration 6man',
    'Valguero 6man',
    'Lost Island 6man',
    'Island 6man',
    'Fjordur 6man',
    'Crystal Isles 6man',
];

function normalizeMapName(raw) {
    if (raw == null) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    return ALPHA_MAP_CHOICES.find((m) => m.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

module.exports = {
    ALPHA_MAP_CHOICES,
    MAP_AUTOCOMPLETE_CHOICES: ALPHA_MAP_CHOICES,
    MAPS: ALPHA_MAP_CHOICES,
    normalizeMapName,
};
