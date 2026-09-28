async function ABBREVIATE_NUMBER(number) {
    if (number < 1000) return number.toString();

    const suffixes = ["", "K", "M", "B", "T"];
    const suffixNum = Math.floor((String(Math.floor(number)).length - 1) / 3);

    const scaled = number / Math.pow(1000, suffixNum);

    let formatted = scaled.toPrecision(3);

    // Remove trailing zeros / unnecessary decimal
    formatted = parseFloat(formatted).toString();

    return formatted + suffixes[suffixNum];
}

module.exports = ABBREVIATE_NUMBER;