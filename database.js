
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function connectDB() {
    const db = await open({
        filename: "./books.db",
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            price REAL NOT NULL
        )
    `);

    // Insert sample books only if the table is empty
    const result = await db.get("SELECT COUNT(*) AS count FROM books");

    if (result.count === 0) {
        await db.run(
            "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
            ["JavaScript Basics", "John", 350]
        );

        await db.run(
            "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
            ["Python Guide", "David", 450]
        );

        await db.run(
            "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
            ["React Handbook", "Alex", 550]
        );
    }

    console.log("Database connected successfully!");

    return db;
}

module.exports = connectDB;
