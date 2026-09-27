import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true
    })
);
app.use(express.json());

// API Routes
app.use("/api", routes);

// Base Route
app.get("/", (req, res) => {
    res.json({
        name: "Hostel Management System API",
        version: "1.0.0",
        status: "Active",
        documentation: "/api/reports/dashboard"
    });
});

// Database Health Check Route
app.get("/api/health/db", async (req, res, next) => {
    try {
        const [result] = await pool.query("SELECT 1 as health");
        res.json({
            status: "success",
            message: "MySQL Connection pool operational",
            data: result
        });
    } catch (error) {
        next(error);
    }
});

// Global Error Handler
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`🚀 Hostel Management API server running on http://localhost:${PORT}`);
    });
}

export default app;