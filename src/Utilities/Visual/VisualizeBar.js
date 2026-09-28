/**
 * Generates a bar to visualize a percentage
 * other maid commands using the assigned snowflake or included entryName.
 * @param {number} value
 * @param {string} vallabelue
 * @param {number} barCount
 * @param {boolean} valushowPercentagee
 */
function VisualizeBar({ value, label, barCount, showPercentage }) {
    const totalBars = barCount || 20;
    const filled = Math.min(totalBars, Math.round((value / 100) * totalBars));
    const bar = "▮".repeat(filled) + "▯".repeat(totalBars - filled);
    const percentage = Math.round(value * 100) / 100;

    if (label) {
        if (showPercentage) {
            return `${label}: [${bar}] (${percentage}%)`;
        } else {
            return `${label}: [${bar}]`;
        }
    } else {
        if (showPercentage) {
            return `[${bar}] (${percentage}%)`;
        } else {
            return `[${bar}]`;
        }
    }
};

module.exports = VisualizeBar;