import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/database";
import { AppError } from "./errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "hostel_management_super_secret_key_2026";

export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return next(new AppError("Access token required. Please login.", 401));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const staffId = decoded.staff_id;

        // Authoritative Database Account Status Verification
        if (staffId) {
            const [rows] = await pool.query<any[]>(
                "SELECT status FROM staff WHERE staff_id = ? LIMIT 1",
                [staffId]
            );
            if (rows.length > 0 && rows[0].status === "INACTIVE") {
                return next(new AppError("Account is disabled. Please contact your administrator.", 403));
            }
        }

        (req as any).user = {
            staff_id: decoded.staff_id,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role
        };
        next();
    } catch (error) {
        if (error instanceof AppError) return next(error);
        return next(new AppError("Invalid or expired access token", 403));
    }
};

export const authorizeRoles = (
    ...roles: Array<"SUPERADMIN" | "HEAD" | "PARTNER" | "MANAGER" | "ADMIN" | "SUPERVISOR" | "MAINTENANCE_STAFF">
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user) {
            return next(new AppError("User not authenticated", 401));
        }

        if (!roles.includes(user.role)) {
            return next(
                new AppError(
                    `Forbidden: Access restricted to roles [${roles.join(", ")}]. Your role is '${user.role}'.`,
                    403
                )
            );
        }

        next();
    };
};
