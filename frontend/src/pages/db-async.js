const sqlite3 = require('sqlite3');
const { open } = require('sqlite3'); // If using 'sqlite' wrapper, or use custom promises below

// A helper to open the database connection
async function openDb() {
  return open({
    filename: './database.db', // Adjust path/filename to match your project setup
    driver: sqlite3.Database
  });
}

// Wrapper object to mimic standard async database operations
const dbAsync = {
  // Run queries that don't return rows (INSERT, UPDATE, DELETE)
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      // Open a standard sqlite3 instance dynamically or pass a persistent instance
      const db = new sqlite3.Database('./database.db', (err) => {
        if (err) return reject(err);
      });

      db.run(sql, params, function (err) {
        db.close();
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  // Fetch a single row (SELECT LIMIT 1)
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('./database.db', (err) => {
        if (err) return reject(err);
      });

      db.get(sql, params, (err, row) => {
        db.close();
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  // Fetch all rows matching a query
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database('./database.db', (err) => {
        if (err) return reject(err);
      });

      db.all(sql, params, (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

module.exports = dbAsync;