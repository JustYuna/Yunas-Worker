const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require('fs');
const { Snowflake } = require('nodejs-snowflake');
const snowflakeGenerator = new Snowflake();

const dbPath = path.join(__dirname, "datastore.db");
let db = new sqlite3.Database(dbPath, (err) => {
  if (err) debug({
    string: `[ERROR]: Database failed to open, error: ${err}!`,
    configSet: CONFIG.DEBUG_LEVELS.ERROR
  });
  else debug({
    string: `[INFO]: Database opened`,
    configSet: CONFIG.DEBUG_LEVELS.INFO
  });;
});

// ----- CONFIG ----- \\
const CONFIG = {
    DEBUG_LEVELS: {
        INFO: { ACTIVE: true, COLOR: "\x1b[36m" },
        WARN: { ACTIVE: true, COLOR: "\x1b[93m" },
        ERROR: { ACTIVE: true, COLOR: "\x1b[31m" },
    }
};

// Single-table structure, nested objects stored as JSON
const defaultData = {
  MAIN_CURRENCY: 0,
  SECOND_CURRENCY: 0,
  DEPOSITED: 0,

  TOTAL_MAIN_CURRENCY: 0,
  TOTAL_SECOND_CURRENCY: 0,

  GAMBLED: 0,
  ROBBED: 0,

  LEVEL: { LEVEL: 0, EXPERIENCE: 0 },
  FACTORY: { LEVEL: 1, LAST_CLAIM: 1779726897264 },

  UPGRADES: { BANK: 1 },
  DAILY: { LAST: "1999.00.00", STREAK: 0, BEST: 0 },
  VOTE_BOOST: 0,

  SETTING_HIDDEN_FROM_LEADERBOARD: false,
};

const defaultGlobalData = {
  COMMANDS_USED: 0,
  TOTAL_SESSIONS: 0,
};

// ------------------ Helpers ------------------
function debug({ string, configSet }) {
    if (configSet.ACTIVE) console.log(configSet.COLOR, string, "\x1b[0m")
}

const activeWritesMap = new Map();

function lockEdit({ id, todo, snowflake }) {
  if (!id) {
    debug({
      string: "[Warn]: No id for lock check",
      configSet: CONFIG.DEBUG_LEVELS.WARN
    });
    return null;
  }

  switch (todo) {
    case "lock": {
      const newSnowflake = snowflakeGenerator.getUniqueID().toString();;
      const queue = activeWritesMap.get(id) || [];

      let resolveWrite;
      const writePromise = new Promise((resolve) => {
        resolveWrite = resolve;
      });

      queue.push({
        snowflake: newSnowflake,
        promise: writePromise,
        resolve: resolveWrite
      });

      activeWritesMap.set(id, queue);

      // First in queue? Execute immediately
      if (queue.length === 1) {
        return { locked: true, snowflake: newSnowflake, execute: true, waitFor: null };
      }
      
      // Not first - need to wait for the previous write
      const previousWrite = queue[queue.length - 2];
      return { locked: true, snowflake: newSnowflake, execute: false, waitFor: previousWrite.promise };
    }

    case "unlock": {
      const queue = activeWritesMap.get(id);
      if (!queue || queue.length === 0) {
        debug({
          string: `[Warn]: No queue found for id: ${id}... did you forget to lock before unlocking it?`,
          configSet: CONFIG.DEBUG_LEVELS.WARN
        });
        return { unlocked: false, reason: "no_queue" };
      }

      const index = queue.findIndex(item => item.snowflake === snowflake);
      if (index === -1) {
        debug({
          string: `[Warn]: Snowflake ${snowflake} not found in queue for id: ${id}`,
          configSet: CONFIG.DEBUG_LEVELS.WARN
        });
        return { unlocked: false, reason: "snowflake_not_found" };
      }

      queue.splice(index, 1);

      if (queue.length > 0) {
        queue[0].resolve(); // Signal next write to start
      }

      activeWritesMap.set(id, queue);
      return { unlocked: true, remaining: queue.length };
    }

    case "isLocked": {
      const queue = activeWritesMap.get(id);
      if (!queue || queue.length === 0) return { locked: false };
      return { 
        locked: true, 
        position: queue.findIndex(item => item.snowflake === snowflake),
        isFirst: queue[0]?.snowflake === snowflake
      };
    }

    default:
      return null;
  }
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function syncUserData() {
  // Get all columns that exist in the DB right now
  const pragma = await new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(users)`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  const existingColumns = pragma.map(r => r.name.toUpperCase());

  // For each key in defaultData, ensure it exists
  for (const [key, value] of Object.entries(defaultData)) {
    if (!existingColumns.includes(key.toUpperCase())) {
      console.log(`[SYNC] Adding missing column: ${key}`);
      let columnType = "TEXT DEFAULT ''";

      if (typeof value === "number") columnType = `INTEGER DEFAULT ${value}`;
      else if (typeof value === "string") columnType = `TEXT DEFAULT '${value}'`;
      else if (typeof value === "boolean") columnType = `INTEGER DEFAULT ${value ? 1 : 0}`;
      else if (typeof value === "object") columnType = `TEXT DEFAULT '{}'`;

      await runAsync(`ALTER TABLE users ADD COLUMN ${key.toLowerCase()} ${columnType}`);
    }
  }

  debug({ string: "User schema synced with defaultData.", configSet: CONFIG.DEBUG_LEVELS.INFO })
}

// ------------------ Schema ------------------
async function initDB() {
  const columns = ["id TEXT PRIMARY KEY"];
  for (const [key, value] of Object.entries(defaultData)) {
    if (typeof value === "object" && value !== null) {
      columns.push(`${key.toLowerCase()} TEXT DEFAULT '{}'`); // store nested objects as JSON
    } else if (typeof value === "number") {
      columns.push(`${key.toLowerCase()} INTEGER DEFAULT ${value}`);
    } else if (typeof value === "string") {
      columns.push(`${key.toLowerCase()} TEXT DEFAULT '${value}'`);
    } else if (typeof value === "boolean") {
      columns.push(`${key.toLowerCase()} INTEGER DEFAULT ${value ? 1 : 0}`);
    }
  }
  const schema = `CREATE TABLE IF NOT EXISTS users (${columns.join(", ")});`;
  await runAsync(schema);

  // 🔄 Sync schema with defaultData (adds new columns if missing)
  await syncUserData();
}

// ------------------ Create / Get / Set ------------------
async function createUser(userId) {
  await runAsync(`INSERT OR IGNORE INTO users (id, setting_hidden_from_leaderboard) VALUES (?, 0)`, [userId]);
}

async function GetAsync(userId, key) {
  const lock = lockEdit({ id: userId, todo: "lock" });
  
  // Wait for our turn if needed - NO POLLING! 🎉
  if (!lock.execute && lock.waitFor) {
    await lock.waitFor;
  }

  try {
    await createUser(userId);
    const row = await getAsync(`SELECT * FROM users WHERE id = ?`, [userId]);
    if (!row) return defaultData[key];

    if (typeof defaultData[key] === "object") {
      return row[key.toLowerCase()] ? JSON.parse(row[key.toLowerCase()]) : defaultData[key];
    } else {
      return row[key.toLowerCase()] ?? defaultData[key];
    }
  } finally {
    lockEdit({ id: userId, todo: "unlock", snowflake: lock.snowflake });
  }
}

async function SetAsync(userId, newData) {
  const lock = lockEdit({ id: userId, todo: "lock" });
  
  if (!lock.execute && lock.waitFor) {
    await lock.waitFor;
  }

  try {
    await createUser(userId);
    
    const MAX = Number.MAX_SAFE_INTEGER;
    const keys = Object.keys(newData);
    
    // Clamp numbers to prevent data corrupting ^^
    const vals = Object.values(newData).map(v => {
      if (typeof v === "number") {
        return Math.min(Math.max(v, -MAX), MAX);
      }
      return typeof v === "object" ? JSON.stringify(v) : v;
    });
    
    const sets = keys.map(k => `${k.toLowerCase()} = ?`).join(", ");
    const sql = `UPDATE users SET ${sets} WHERE id = ?`;
    await runAsync(sql, [...vals, userId]);
  } finally {
    lockEdit({ id: userId, todo: "unlock", snowflake: lock.snowflake });
  }
}

async function AddToAsync(userId, updates) {
  const lock = lockEdit({ id: userId, todo: "lock" });
  
  // Wait for our turn if needed
  if (!lock.execute && lock.waitFor) {
    await lock.waitFor;
  }

  try {
    await createUser(userId);
    const sets = Object.keys(updates)
      .map(key => `${key.toLowerCase()} = ${key.toLowerCase()} + ?`)
      .join(', ');
    const values = [...Object.values(updates), userId];
    const sql = `UPDATE users SET ${sets} WHERE id = ?`;
    await runAsync(sql, values);
  } finally {
    lockEdit({ id: userId, todo: "unlock", snowflake: lock.snowflake });
  }
}

// ------------------ Extra Queries ------------------
async function GetTopAsync(column) {
  const rows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, ${column.toLowerCase()} FROM users ORDER BY ${column.toLowerCase()} DESC LIMIT 10`,
      [],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
  return rows.map((row) => ({ id: row.id, value: row[column.toLowerCase()] ?? 0 }));
}

async function GetTotalUserCount() {
  const row = await getAsync(`SELECT COUNT(*) as count FROM users`);
  return row.count;
}

async function GetTotalInCirculation(column) {
    const row = await getAsync(`SELECT SUM(${column.toLowerCase()}) as total FROM users`);
    return row?.total ?? 0;
}

// ------------------ Global Helpers ------------------

async function initGlobals() {
  // Create table with a single row (id = 'main') to store bot stats
  const columns = ["id TEXT PRIMARY KEY"];
  for (const [key, value] of Object.entries(defaultGlobalData)) {
    let type = typeof value === "number" ? "INTEGER" : "TEXT";
    columns.push(`${key.toLowerCase()} ${type} DEFAULT ${typeof value === 'number' ? value : "''"}`);
  }
  
  await runAsync(`CREATE TABLE IF NOT EXISTS globals (${columns.join(", ")});`);
  await runAsync(`INSERT OR IGNORE INTO globals (id) VALUES ('main')`);
}

/**
 * Get a global bot stat
 */
async function GetGlobalAsync(key) {
  const row = await getAsync(`SELECT ${key.toLowerCase()} FROM globals WHERE id = 'main'`);
  return row ? row[key.toLowerCase()] : defaultGlobalData[key];
}

/**
 * Increment a global bot stat (e.g., commands_used)
 */
async function AddToGlobalAsync(updates) {
  const sets = Object.keys(updates)
    .map(key => `${key.toLowerCase()} = ${key.toLowerCase()} + ?`)
    .join(', ');
  const values = [...Object.values(updates)];
  await runAsync(`UPDATE globals SET ${sets} WHERE id = 'main'`, values);
}

/**
 * Directly set a global value (e.g., setting a global event multiplier)
 */
async function SetGlobalAsync(newData) {
  for (const [key, value] of Object.entries(newData)) {
    await runAsync(`UPDATE globals SET ${key.toLowerCase()} = ? WHERE id = 'main'`, [value]);
  }
}

// ------------------ Remove User ------------------
async function removeUser(userId) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
            if (err) return reject(err);
            resolve(`User ${userId} removed successfully.`);
        });
    });
}


// ------------------ Backup / Restore ------------------
async function CreateBackup(name) {
    if (!name) throw new Error("Backup name is required");
    const backupPath = path.join(__dirname, `${name}.db`);
    return new Promise((resolve, reject) => {
        fs.copyFile(dbPath, backupPath, (err) => {
            if (err) reject(err);
            else resolve(`Backup created: ${backupPath}`);
        });
    });
}

async function LoadBackup(name) {
    if (!name) throw new Error("Backup name is required");
    const backupPath = path.join(__dirname, `${name}.db`);
    return new Promise((resolve, reject) => {
        fs.access(backupPath, fs.constants.F_OK, (err) => {
            if (err) return reject(`Backup not found: ${backupPath}`);
            
            db.close((closeErr) => {
                if (closeErr) return reject(closeErr);
                
                // Overwrite current DB with backup
                fs.copyFile(backupPath, dbPath, (copyErr) => {
                    if (copyErr) return reject(copyErr);
                    
                    // Reopen database
                    db = new sqlite3.Database(dbPath, (openErr) => {
                        if (openErr) reject(openErr);
                        else resolve(`Backup loaded: ${backupPath}`);
                    });
                });
            });
        });
    });
}

module.exports = {
  // User Exports
  GetAsync,
  SetAsync,
  AddToAsync,
  GetTopAsync,
  GetTotalUserCount,
  GetTotalInCirculation,
  
  // Global Bot-Exclusive Exports
  GetGlobalAsync,
  SetGlobalAsync,
  AddToGlobalAsync,
  
  // Utility
  CreateBackup,
  LoadBackup,
  removeUser,

  // Startup
  initDB, initGlobals
};