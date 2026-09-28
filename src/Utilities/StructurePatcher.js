const ConfigManager = require("../Core/configManager");
const { editCooldown } = require("./Cooldown");

module.exports = {
    /**
     * Patches missing/default values into existing data while preserving existing values
     * @param {Object} existingData - The current user data
     * @param {Object} defaultStructure - The complete default structure with all expected fields
     * @param {Object} options - Patch options
     * @param {boolean} options.deepMerge - Whether to deep merge nested objects (default: true)
     * @param {boolean} options.preserveArrays - Whether to preserve arrays instead of replacing (default: true)
     * @param {Array} options.corruptPaths - Paths that should be completely reset (e.g., ["achievements.brokenArray"])
     * @returns {Object} { patchedData, changes: string[], needsSave: boolean }
     */
    PATCH_MISSING_VALUES(existingData, defaultStructure, options = {}) {
        const { deepMerge = true, preserveArrays = true, corruptPaths = [] } = options;
        const changes = [];

        if (!existingData || typeof existingData !== "object") {
            return {
                patchedData: { ...defaultStructure },
                changes: ["Data was null/invalid, reset to default"],
                needsSave: true
            };
        }

        const patchedData = { ...existingData };

        // Helper function to check if a path is corrupt
        const isCorruptPath = (path) => {
            return corruptPaths.some(corruptPath => path.startsWith(corruptPath));
        };

        // Recursive patch function
        const patchRecursive = (target, source, currentPath = "") => {
            for (const [key, defaultValue] of Object.entries(source)) {
                const newPath = currentPath ? `${currentPath}.${key}` : key;

                // If this path is marked corrupt, reset it fully
                if (isCorruptPath(newPath)) {
                    if (JSON.stringify(target[key]) !== JSON.stringify(defaultValue)) {
                        changes.push(`Reset corrupt path "${newPath}" to default`);
                        target[key] = Array.isArray(defaultValue) && preserveArrays
                            ? [...defaultValue]
                            : (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)
                                ? { ...defaultValue }
                                : defaultValue);
                    }
                    continue;
                }

                // Property doesn't exist at all
                if (!target.hasOwnProperty(key)) {
                    changes.push(`Added missing property: ${newPath}`);
                    target[key] = Array.isArray(defaultValue) && preserveArrays
                        ? [...defaultValue]
                        : (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)
                            ? { ...defaultValue }
                            : defaultValue);
                    continue;
                }

                // Handle nested objects
                if (deepMerge &&
                    typeof defaultValue === "object" &&
                    defaultValue !== null &&
                    !Array.isArray(defaultValue) &&
                    typeof target[key] === "object" &&
                    target[key] !== null &&
                    !Array.isArray(target[key])) {
                    patchRecursive(target[key], defaultValue, newPath);
                }
                // Handle arrays (preserve if needed)
                else if (Array.isArray(defaultValue)) {
                    if (preserveArrays && Array.isArray(target[key])) {
                        // Only add missing items, don't remove extras
                        for (const item of defaultValue) {
                            if (!target[key].includes(item)) {
                                changes.push(`Added missing array item "${item}" to ${newPath}`);
                                target[key].push(item);
                            }
                        }
                    } else if (!Array.isArray(target[key])) {
                        changes.push(`Converted ${newPath} from ${typeof target[key]} to array`);
                        target[key] = [...defaultValue];
                    }
                }
                // Type mismatch but not corrupt
                else if (typeof target[key] !== typeof defaultValue && target[key] !== undefined) {
                    changes.push(`Fixed type mismatch for ${newPath}: was ${typeof target[key]}, now ${typeof defaultValue}`);
                    target[key] = defaultValue;
                }
            }
        };

        patchRecursive(patchedData, defaultStructure);

        return {
            patchedData,
            changes,
            needsSave: changes.length > 0
        };
    },

    /**
     * Simple patch function - adds missing fields from default structure to existing data
     * @param {Object} existingData - The current user data (can be null/undefined)
     * @param {Object} defaultStructure - The complete default structure with all expected fields
     * @param {Object} options - Optional configuration
     * @param {boolean} options.deepMerge - Whether to recursively merge nested objects (default: true)
     * @param {boolean} options.logChanges - Whether to return change list (default: true)
     * @returns {Object} { data: Object, changes: string[], patched: boolean }
     */
    SIMPLE_PATCH(existingData, defaultStructure, options = {}) {
        const { deepMerge = true, logChanges = true } = options;
        const changes = [];

        // Handle null/undefined existing data
        if (!existingData || typeof existingData !== "object") {
            return {
                data: JSON.parse(JSON.stringify(defaultStructure)), // Deep clone
                changes: ["Data was null/invalid, reset to default"],
                patched: true
            };
        }

        // Start with existing data
        const patched = { ...existingData };

        // Simple recursive patch
        const patchObject = (target, source, path = "") => {
            for (const [key, defaultValue] of Object.entries(source)) {
                const currentPath = path ? `${path}.${key}` : key;

                // If property doesn't exist in target
                if (!target.hasOwnProperty(key)) {
                    if (logChanges) changes.push(`Added missing: ${currentPath}`);
                    target[key] = Array.isArray(defaultValue)
                        ? [...defaultValue]
                        : (typeof defaultValue === "object" && defaultValue !== null)
                            ? { ...defaultValue }
                            : defaultValue;
                    continue;
                }

                // Handle nested objects
                if (deepMerge &&
                    typeof defaultValue === "object" &&
                    defaultValue !== null &&
                    !Array.isArray(defaultValue) &&
                    typeof target[key] === "object" &&
                    target[key] !== null &&
                    !Array.isArray(target[key])) {
                    patchObject(target[key], defaultValue, currentPath);
                }
                // Handle type mismatch
                else if (typeof target[key] !== typeof defaultValue && target[key] !== undefined) {
                    if (logChanges) changes.push(`Fixed type mismatch: ${currentPath} (was ${typeof target[key]}, now ${typeof defaultValue})`);
                    target[key] = Array.isArray(defaultValue)
                        ? [...defaultValue]
                        : (typeof defaultValue === "object" && defaultValue !== null)
                            ? { ...defaultValue }
                            : defaultValue;
                }
            }
        };

        patchObject(patched, defaultStructure);

        return {
            data: patched,
            changes: changes,
            patched: changes.length > 0
        };
    },

    /**
     * Even SIMPLER - no recursion, just top-level fields only
     * @param {Object} existingData - The current user data
     * @param {Object} defaultStructure - Default structure (only top-level)
     * @param {Object} options - Optional config
     * @param {boolean} options.mergeNested - Whether to merge nested objects instead of replacing (default: true)
     * @returns {Object} { data: Object, patched: boolean }
     */
    BASIC_PATCH(existingData, defaultStructure, options = {}) {
        const { mergeNested = true } = options;

        if (!existingData || typeof existingData !== "object") {
            return { data: { ...defaultStructure }, patched: true };
        }

        const patched = { ...existingData };
        let patchedCount = 0;

        for (const [key, defaultValue] of Object.entries(defaultStructure)) {
            // Property doesn't exist
            if (!patched.hasOwnProperty(key)) {
                patched[key] = Array.isArray(defaultValue)
                    ? [...defaultValue]
                    : (typeof defaultValue === "object" && defaultValue !== null)
                        ? { ...defaultValue }
                        : defaultValue;
                patchedCount++;
                continue;
            }

            // Handle nested objects (merge instead of replace)
            if (mergeNested &&
                typeof defaultValue === "object" &&
                defaultValue !== null &&
                !Array.isArray(defaultValue) &&
                typeof patched[key] === "object" &&
                patched[key] !== null &&
                !Array.isArray(patched[key])) {

                for (const [nestedKey, nestedDefault] of Object.entries(defaultValue)) {
                    if (!patched[key].hasOwnProperty(nestedKey)) {
                        patched[key][nestedKey] = Array.isArray(nestedDefault)
                            ? [...nestedDefault]
                            : (typeof nestedDefault === "object" && nestedDefault !== null)
                                ? { ...nestedDefault }
                                : nestedDefault;
                        patchedCount++;
                    }
                }
            }
        }

        return { data: patched, patched: patchedCount > 0 };
    }
};