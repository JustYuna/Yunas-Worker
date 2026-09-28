async function PLURALIZE({ notPluralized, pluralized, number }) {
    if (!notPluralized || !pluralized)
        return "";

    if (isNaN(number))
        return notPluralized;

    return  Number(number) === 1 ? notPluralized : pluralized
};

module.exports = PLURALIZE;