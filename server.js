
const express = require("express");
const connectDB = require("./database");

const app = express();
const PORT = 3000;

app.use(express.json());

let db;

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "Book Management API is running!"
    });
});


app.get("/books", async (req, res) => {
    try {
        const {
            search_q,
            order_by = "title",
            order = "ASC",
            limit = "10",
            offset = "0",
            min_price,
            max_price
        } = req.query;

        // Validate sorting
        const allowedColumns = ["id", "title", "author", "price"];

        if (!allowedColumns.includes(order_by)) {
            return res.status(400).json({
                message: "Invalid order_by value"
            });
        }

        const sortOrder = order.toUpperCase();

        if (!["ASC", "DESC"].includes(sortOrder)) {
            return res.status(400).json({
                message: "Order must be ASC or DESC"
            });
        }

        // Validate pagination
        const pageLimit = Number(limit);
        const pageOffset = Number(offset);

        if (
            !Number.isInteger(pageLimit) || pageLimit < 1 ||
            !Number.isInteger(pageOffset) || pageOffset < 0
        ) {
            return res.status(400).json({
                message: "Invalid limit or offset"
            });
        }

        // Build filters
        let conditions = [];
        let params = [];

        if (search_q) {
            conditions.push("title LIKE ?");
            params.push(`%${search_q}%`);
        }

        if (min_price !== undefined) {
            const min = Number(min_price);

            if (!Number.isFinite(min)) {
                return res.status(400).json({
                    message: "Invalid minimum price"
                });
            }

            conditions.push("price >= ?");
            params.push(min);
        }

        if (max_price !== undefined) {
            const max = Number(max_price);

            if (!Number.isFinite(max)) {
                return res.status(400).json({
                    message: "Invalid maximum price"
                });
            }

            conditions.push("price <= ?");
            params.push(max);
        }

        if (min_price !== undefined && max_price !== undefined &&
            Number(min_price) > Number(max_price)) {
            return res.status(400).json({
                message: "Minimum price cannot exceed maximum price"
            });
        }

        const whereClause = conditions.length
            ? "WHERE " + conditions.join(" AND ")
            : "";

        const sql = `
            SELECT * FROM books
            ${whereClause}
            ORDER BY ${order_by} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        params.push(pageLimit, pageOffset);

        const books = await db.all(sql, params);

        res.status(200).json({
            message: "Books fetched successfully",
            count: books.length,
            data: books
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching books"
        });
    }
});


// POST - Add a new book
app.post("/books", async (req, res) => {
    try {
        const { title, author, price } = req.body;

        // Validate input
        if (
            !title || typeof title !== "string" || !title.trim() ||
            !author || typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price)
        ) {
            return res.status(400).json({
                message: "Title, author and a valid numeric price are required"
            });
        }

        // Insert book into database
        const result = await db.run(
            "INSERT INTO books (title, author, price) VALUES (?, ?, ?)",
            [title.trim(), author.trim(), price]
        );

        res.status(201).json({
            message: "Book added successfully",
            bookId: result.lastID
        });

    } catch (error) {
        res.status(500).json({
            message: "Error adding book"
        });
    }
});

// PUT - Update a book
app.put("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { title, author, price } = req.body;

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        if (
            !title || typeof title !== "string" || !title.trim() ||
            !author || typeof author !== "string" || !author.trim() ||
            typeof price !== "number" || !Number.isFinite(price)
        ) {
            return res.status(400).json({
                message: "Title, author and valid numeric price are required"
            });
        }

        const existingBook = await db.get(
            "SELECT * FROM books WHERE id = ?", [id]
        );

        if (!existingBook) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        await db.run(
            "UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?",
            [title.trim(), author.trim(), price, id]
        );

        res.status(200).json({
            message: "Book updated successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating book"
        });
    }
});

// DELETE - Delete a book
app.delete("/books/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id < 1) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const existingBook = await db.get(
            "SELECT * FROM books WHERE id = ?", [id]
        );

        if (!existingBook) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        await db.run(
            "DELETE FROM books WHERE id = ?", [id]
        );

        res.status(200).json({
            message: "Book deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error deleting book"
        });
    }
});



// Start server after connecting database
async function startServer() {
    try {
        db = await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error);
    }
}

startServer();
