const ConfigManager = require("../Core/configManager");
const { editCooldown } = require("./Cooldown");

module.exports = {
    VALIDATE_CURRENCY: async (interaction, amount, { min, max, userBalance, command = "action" }) => {

        // 1. Check Minimum Requirement
        if (min && amount < min) {
            editCooldown(interaction, command, 10);
            return interaction.editReply({
                content: ConfigManager.getMsg("CORE.MESSAGES.MIN_CURRENCY_REQUIRED", { amount: min }),
                flags: 64
            });
        }

        // 2. Check Maximum Allowed
        if (max && amount > max) {
            editCooldown(interaction, command, 10);
            return interaction.editReply({
                content: ConfigManager.getMsg("CORE.MESSAGES.MAX_CURRENCY_ALLOWED", { amount: max }),
                flags: 64
            });
        }

        // 3. Check if User has enough
        if (amount > userBalance) {
            editCooldown(interaction, command, 10);
            return interaction.editReply({
                content: ConfigManager.getMsg("CORE.MESSAGES.NOT_ENOUGH_CURRENCY"),
                flags: 64
            });
        }

        return null;
    },

    /**
     * Checks if an object needs to be reset based on missing or invalid values
     * @param {Object} data - The data to validate
     * @param {Object} options - Validation options
     * @param {Array} options.requiredProps - Array of property names that must exist
     * @param {Object} options.typeChecks - Object mapping property names to expected types
     * @param {Array} options.minValues - Array of { prop, min } for minimum values
     * @returns {Object} { needsReset: boolean, reason: string }
     */
    CHECK_MISSING_VALUES(data, options = {}) {
        const { requiredProps = [], typeChecks = {}, minValues = [] } = options;

        // Check if data is null or undefined
        if (!data || typeof data !== "object") {
            return { needsReset: true, reason: "data is null or not an object" };
        }

        // Check for required properties
        for (const prop of requiredProps) {
            if (!data.hasOwnProperty(prop)) {
                return { needsReset: true, reason: `missing required property: ${prop}` };
            }
        }

        // Check property types
        for (const [prop, expectedType] of Object.entries(typeChecks)) {
            if (data.hasOwnProperty(prop) && typeof data[prop] !== expectedType) {
                return { needsReset: true, reason: `${prop} should be ${expectedType}, got ${typeof data[prop]}` };
            }
        }

        // Check minimum values
        for (const { prop, min } of minValues) {
            if (data.hasOwnProperty(prop) && typeof data[prop] === "number" && data[prop] < min) {
                return { needsReset: true, reason: `${prop} is ${data[prop]} (minimum ${min})` };
            }
        }

        return { needsReset: false, reason: null };
    },

    /**
     * Resets an object to default values
     * @param {Object} defaultValues - The default values to reset to
     * @returns {Object} The reset object
     */
    GET_RESET_DATA(defaultValues) {
        return { ...defaultValues };
    },

    IS_LEVEL_LOCKED(interaction, { lockName, levelData }) {
        let levelLock = ConfigManager.raw.PROGRESSION.LEVEL_LOCKS[lockName];

        if (isNaN(levelLock))
            levelLock = ConfigManager.raw.PROGRESSION.LEVEL_LOCKS.FALLBACK;

        if (levelData.LEVEL < levelLock) {
            interaction.editReply({
                content: ConfigManager.getMsg(
                    "CORE.MESSAGES.COMMAND_NOT_HIGH_ENOUGH_LEVEL",
                    { level: levelLock }
                )
            });
            return true
        }

        return false
    } 
};