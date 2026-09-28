// Cooldown.js
const CacheMaid = require("./CacheMaid");
const configManager = require("../Core/configManager")

const cooldowns = CacheMaid.new("cooldown");

/**
 * Clean up expired cooldowns for a user
 */
function cleanExpiredForUser(userMap) {
    if (!userMap) return;
    const now = Date.now();
    for (const [cmd, expires] of userMap.entries()) {
        if (expires <= now) {
            userMap.delete(cmd);
        }
    }
}

/**
 * Check if a user is on cooldown for a command
 * @param {Interaction} interaction 
 * @param {string} command 
 * @returns {Promise<boolean>} true if still on cooldown
 */
async function checkCooldown(interaction, command) {
    const userId = interaction.user.id;

    // Get or create user's cooldown map
    let userMap = cooldowns.map.get(userId);
    if (!userMap) {
        userMap = new Map();
        cooldowns.map.set(userId, userMap);
    }

    // Clean expired entries before checking
    cleanExpiredForUser(userMap);

    const expiration = userMap.get(command);
    if (expiration && expiration > Date.now()) {
        const remainingSeconds = Math.ceil((expiration - Date.now()) / 1000);
        const msg = configManager.getMsg("CORE.MESSAGES.ACTION_COOLDOWN", { command: command, remainingSeconds: remainingSeconds })

        await interaction.editReply({
            content: msg,
            flags: 64,
        });

        return true;
    }

    return false;
}

/**
 * Set a cooldown for a user-command pair
 * @param {Interaction} interaction 
 * @param {string} command 
 * @param {number} duration in seconds
 */
function setCooldown(interaction, command, duration) {
    const userId = interaction.user.id;

    let userMap = cooldowns.map.get(userId);
    if (!userMap) {
        userMap = new Map();
        cooldowns.map.set(userId, userMap);
    }

    // Clean expired before setting new one
    cleanExpiredForUser(userMap);

    const expiration = Date.now() + duration * 1000;
    userMap.set(command, expiration);
}

/**
 * Edit an existing cooldown
 */
function editCooldown(interaction, command, duration) {
    setCooldown(interaction, command, duration);
}

/**
 * Returns all active cooldowns asigned to a userid
 */
function getCooldowns(userId) {
    if (!userId) return cooldowns.map;

    return cooldowns.map.get(userId) || new Map();
}

function removeCooldowns(userID) {
    if (!userID) return;

    cooldowns.map.clear(userID);
}

module.exports = {
    checkCooldown,
    setCooldown,
    editCooldown,
    getCooldowns,
    removeCooldowns,
};