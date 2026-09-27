import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope, getHostelIdFromBed } from "../utils/scope";

export const getAllBeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { room_id, hostel_id, status } = req.query;
        let query = `
            SELECT b.*, r.room_number, r.capacity, f.floor_number, f.hostel_id, h.name as hostel_name
            FROM bed b
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE 1=1
        `;
        const params: any[] = [];

        const currentUser = (req as any).user;
        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND f.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (room_id) {
            query += " AND b.room_id = ?";
            params.push(room_id);
        }

        if (hostel_id) {
            query += " AND f.hostel_id = ?";
            params.push(hostel_id);
        }

        if (status) {
            query += " AND b.status = ?";
            params.push(status);
        }

        query += " ORDER BY f.hostel_id, f.floor_number, r.room_number, b.bed_number";

        const [rows] = await pool.query<any[]>(query, params);

        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const getAvailableBeds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hostelId = req.query.hostel_id ? Number(req.query.hostel_id) : null;
        const currentUser = (req as any).user;

        let query = `
            SELECT b.bed_id, b.bed_number, b.status, r.room_id, r.room_number, r.room_type,
                   f.floor_id, f.floor_number, h.hostel_id, h.name as hostel_name
            FROM bed b
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE b.status = 'AVAILABLE' AND r.status != 'INACTIVE' AND h.status = 'ACTIVE'
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (hostelId) {
            query += " AND h.hostel_id = ?";
            params.push(hostelId);
        }

        query += " ORDER BY h.hostel_id, f.floor_number, r.room_number, b.bed_number";

        const [rows] = await pool.query<any[]>(query, params);

        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { room_id, bed_number, status } = req.body;
        const currentUser = (req as any).user;

        if (!room_id || !bed_number) {
            return next(new AppError("room_id and bed_number are required", 400));
        }

        // Resolve room and hostel_id for scope enforcement
        const [rooms] = await pool.query<any[]>(
            `SELECT r.room_id, r.capacity, f.hostel_id,
                    (SELECT COUNT(*) FROM bed b WHERE b.room_id = r.room_id AND b.status != 'INACTIVE') as current_beds
             FROM room r
             JOIN floor f ON r.floor_id = f.floor_id
             WHERE r.room_id = ?`,
            [room_id]
        );

        if (rooms.length === 0) {
            return next(new AppError("Room not found", 404));
        }

        const roomInfo = rooms[0];

        if (currentUser) {
            await enforceHostelScope(currentUser, roomInfo.hostel_id);
        }

        // Rule 1 Enforcement: Room capacity is maximum number of beds that can exist in that room
        if (roomInfo.current_beds >= roomInfo.capacity) {
            return next(new AppError(`Cannot create bed. Room capacity of ${roomInfo.capacity} bed(s) has already been reached.`, 400));
        }

        const [result] = await pool.query<any>(
            `INSERT INTO bed (room_id, bed_number, status)
             VALUES (?, ?, COALESCE(?, 'AVAILABLE'))`,
            [room_id, bed_number, status]
        );

        res.status(201).json({
            status: "success",
            message: "Bed created successfully",
            data: {
                bed_id: result.insertId,
                room_id,
                bed_number,
                status: status || "AVAILABLE"
            }
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Bed number already exists in this room", 400));
        }
        next(error);
    }
};

export const updateBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bedId = Number(req.params.id);
        const { bed_number, status } = req.body;
        const currentUser = (req as any).user;

        const hostelId = await getHostelIdFromBed(bedId);
        if (currentUser) {
            await enforceHostelScope(currentUser, hostelId);
        }

        await pool.query(
            `UPDATE bed
             SET bed_number = COALESCE(?, bed_number),
                 status = COALESCE(?, status)
             WHERE bed_id = ?`,
            [bed_number, status, bedId]
        );

        res.json({
            status: "success",
            message: "Bed updated successfully"
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Bed number already exists in this room", 400));
        }
        next(error);
    }
};

export const deleteBed = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bedId = Number(req.params.id);
        const currentUser = (req as any).user;

        const hostelId = await getHostelIdFromBed(bedId);
        if (currentUser) {
            await enforceHostelScope(currentUser, hostelId);
        }

        await pool.query("UPDATE bed SET status = 'INACTIVE' WHERE bed_id = ?", [bedId]);

        res.json({
            status: "success",
            message: "Bed status marked as INACTIVE"
        });
    } catch (error) {
        next(error);
    }
};
