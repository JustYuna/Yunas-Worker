const fs = require('fs');
const path = require('path');

function loadModules(sourceDir) {
    const modules = {};

    function walk(dir) {
        if (!fs.existsSync(dir)) {
            console.warn(`⚠️ Skipping missing directory: ${dir}`);
            return;
        }

        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
            const itemPath = path.resolve(dir, item.name);

            if (item.isDirectory()) {
                walk(itemPath); // recurse
            } else if (item.isFile() && item.name.endsWith('.js')) {
                const moduleName = path.basename(item.name, '.js');
                try {
                    modules[moduleName] = require(itemPath);
                } catch (err) {
                    console.error(`❌ Failed to load module ${itemPath}:`, err.message);
                }
            }
        }
    }

    walk(sourceDir);

    return modules;
}

module.exports = loadModules;