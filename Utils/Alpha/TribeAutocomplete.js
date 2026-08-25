const AUTOCOMPLETE_PLACEHOLDER_VALUES = new Set(['no_data', 'no_tribes', 'no_matches']);

const isTribeAutocompletePlaceholder = (value) => {
    if (value == null) return true;
    const normalized = String(value).trim().toLowerCase();
    return !normalized || AUTOCOMPLETE_PLACEHOLDER_VALUES.has(normalized);
};

const buildTribeAutocompleteOptions = (tribes, focusedValue, { excludeTribeName } = {}) => {
    const query = String(focusedValue || '').toLowerCase();
    const exclude = excludeTribeName ? String(excludeTribeName).toLowerCase() : null;
    return tribes
        .filter((tribe) => {
            const tribeName = String(tribe.tribe_name || '').toLowerCase();
            if (exclude && tribeName === exclude) return false;
            return tribeName.includes(query);
        })
        .slice(0, 25)
        .map((tribe) => ({
            name: tribe.tribe_name,
            value: tribe.tribe_name
        }));
};

const respondTribeAutocomplete = async (interaction, tribes, { excludeTribeName } = {}) => {
    const focusedOption = interaction.options.getFocused(true);
    if (!focusedOption) {
        return interaction.respond([{ name: 'No Data', value: 'no_data' }]);
    }
    if (!tribes || tribes.length === 0) {
        return interaction.respond([{ name: 'No Tribes Found', value: 'no_tribes' }]);
    }
    const options = buildTribeAutocompleteOptions(tribes, focusedOption.value, { excludeTribeName });
    return interaction.respond(options.length > 0 ? options : [{ name: 'No Matches Found', value: 'no_matches' }]);
};

module.exports = {
    AUTOCOMPLETE_PLACEHOLDER_VALUES,
    isTribeAutocompletePlaceholder,
    buildTribeAutocompleteOptions,
    respondTribeAutocomplete
};
