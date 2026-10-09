import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope } from "../utils/scope";

const JWT_SECRET = process.env.JWT_SECRET || "hostel_management_super_secret_key_2026";

// bcrypt cost factor: env-configurable, defaults to 10 (preserves existing
// security). Never lowered implicitly for benchmarks.
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
// bcrypt truncates inputs at 72 bytes; reject oversized inputs before
// paying the cost of hashing/comparison (also mitigates DoS via huge bodies).
const BCRYPT_MAX_BYTES = 72;
// Pre-computed dummy hash used for constant-time failure when the user does
// not exist (mitigates user-enumeration via timing). Cost matches production.
// Hash of "invalid-password-dummy-timing-mitigation" at cost 10.
const DUMMY_HASH = "$2b$10$mVKND7H1q.gshIgIHceUSeE.UrBFpFwILsx1D0CWWxiTQSzbtbwPW";

function getPasswordByteLength(password: string): number {
    return Buffer.byteLength(password, "utf8");
}

export const registerStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !role) {
            return next(new AppError("Name, email, password, and role are required", 400));
        }

        if (!["SUPERADMIN", "ADMIN", "HEAD", "PARTNER", "MANAGER", "SUPERVISOR", "MAINTENANCE_STAFF"].includes(role)) {
            return next(new AppError("Invalid role specified", 400));
        }

        // Fail fast before the expensive bcrypt.hash: bcrypt truncates at 72
        // bytes, so oversized passwords could never verify as typed.
        if (typeof password !== "string" || getPasswordByteLength(password) > BCRYPT_MAX_BYTES) {
            return next(new AppError("Password must be a string of at most 72 bytes", 400));
        }

        const [existing] = await pool.query<any[]>(
            "SELECT staff_id FROM staff WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return next(new AppError("Email already registered", 400));
        }

        const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const [result] = await pool.query<any>(
            `INSERT INTO staff (name, email, password_hash, phone, role, status)
             VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
            [name, email, password_hash, phone || null, role]
        );

        res.status(201).json({
            status: "success",
            success: true,
            message: "Staff registered successfully",
            data: {
                staff_id: result.insertId,
                name,
                email,
                role,
                phone: phone || null
            }
        });
    } catch (error) {
        next(error);
    }
};

export const loginStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("Email and password are required", 400));
        }

        // Fail fast before the expensive bcrypt.compare: wrong types or
        // oversized inputs can never match (bcrypt truncates at 72 bytes).
        if (typeof password !== "string" || getPasswordByteLength(password) > BCRYPT_MAX_BYTES) {
            // Constant-time dummy compare so oversized/wrong-type attempts do
            // not return measurably faster than a real mismatch.
            await bcrypt.compare("dummy-password-for-timing-mitigation", DUMMY_HASH);
            return next(new AppError("Invalid credentials", 401));
        }

        const [rows] = await pool.query<any[]>(
            "SELECT staff_id, name, email, password_hash, phone, role, status FROM staff WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            // Constant-time dummy compare to mitigate user-enumeration timing.
            await bcrypt.compare(password, DUMMY_HASH);
            return next(new AppError("Invalid credentials", 401));
        }

        const staff = rows[0];

        if (staff.status !== "ACTIVE") {
            return next(new AppError("Account is inactive. Please contact administrator.", 403));
        }

        if (!staff.password_hash) {
            return next(new AppError("Password not set for this user. Please contact admin.", 401));
        }

        const isMatch = await bcrypt.compare(password, staff.password_hash);
        if (!isMatch) {
            return next(new AppError("Invalid credentials", 401));
        }

        // Start the scope DB lookup first, then sign the JWT while it is in
        // flight (independent operations overlap instead of serializing).
        const scopePromise = buildUserScope(staff);
        const options: SignOptions = { expiresIn: "24h" };
        const token = jwt.sign(
            {
                staff_id: staff.staff_id,
                name: staff.name,
                email: staff.email,
                role: staff.role
            },
            JWT_SECRET,
            options
        );

        const scope = await scopePromise;

        res.json({
            status: "success",
            success: true,
            message: "Login successful",
            token,
            user: {
                staff_id: staff.staff_id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
                role: staff.role
            },
            data: {
                token,
                csrfToken: token,
                user: {
                    id: String(staff.staff_id),
                    name: staff.name,
                    email: staff.email,
                    role: staff.role
                },
                scope,
                hostels: []
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return next(new AppError("Not authenticated", 401));
        }

        const [rows] = await pool.query<any[]>(
            "SELECT staff_id, name, email, phone, role, status, created_at FROM staff WHERE staff_id = ?",
            [user.staff_id]
        );

        if (rows.length === 0) {
            return next(new AppError("Staff record not found", 404));
        }

        const s = rows[0];
        const authToken = req.headers.authorization?.replace("Bearer ", "") || "active-token";
        const scope = await buildUserScope(s);

        res.json({
            status: "success",
            success: true,
            data: {
                staff_id: s.staff_id,
                name: s.name,
                email: s.email,
                phone: s.phone,
                role: s.role,
                user: {
                    id: String(s.staff_id),
                    name: s.name,
                    email: s.email,
                    role: s.role
                },
                scope,
                hostels: [],
                csrfToken: authToken
            }
        });
    } catch (error) {
        next(error);
    }
};
