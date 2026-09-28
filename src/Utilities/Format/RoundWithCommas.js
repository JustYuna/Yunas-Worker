/**
 * ROUND_WITH_COMMAS({ number, commandAmount })
 * 
 * Rounds a number to X decimal places and adds comma separators.
 * 
 * @param {number} number - The number to format
 * @param {number} commandAmount - How many decimal places to keep
 * @returns {string} Formatted number (e.g., "1,234.56")
 * 
 * Example: ROUND_WITH_COMMAS({ number: 1234.567, commandAmount: 2 }) → "1,234.57"
 */
async function ROUND_WITH_COMMAS({ number, commandAmount }) {
    if (number === undefined || number === null || isNaN(number)) return number;

    const rounded = Number(number).toFixed(commandAmount);
    const [whole, decimal] = rounded.split(".");
    const withCommas = parseInt(whole).toLocaleString("en-US");

    return decimal ? `${withCommas}.${decimal}` : withCommas;
}

module.exports = ROUND_WITH_COMMAS;