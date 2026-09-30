import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope, getHostelIdFromRoom } from "../utils/scope";

export const getAllRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { floor_id, hostel_id, status } = req.query;
        let query = `
            SELECT r.*, f.floor_number, f.hostel_id, h.name as hostel_name,
                   (SELECT COUNT(*) FROM bed b WHERE b.room_id = r.room_id AND b.status != 'INACTIVE') as total_beds,
                   (SELECT COUNT(*) FROM bed b WHERE b.room_id = r.room_id AND b.status = 'OCCUPIED') as occupied_beds
            FROM room r
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

        if (floor_id) {
            query += " AND r.floor_id = ?";
            params.push(floor_id);
        }

        if (hostel_id) {
            query += " AND f.hostel_id = ?";
            params.push(hostel_id);
        }

        if (status) {
            query += " AND r.status = ?";
            params.push(status);
        }

        query += " ORDER BY f.hostel_id, f.floor_number, r.room_number";

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

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roomId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [rows] = await pool.query<any[]>(
            `SELECT r.*, f.floor_number, f.hostel_id, h.name as hostel_name
             FROM room r
             JOIN floor f ON r.floor_id = f.floor_id
             JOIN hostel h ON f.hostel_id = h.hostel_id
             WHERE r.room_id = ?`,
            [roomId]
        );

        if (rows.length === 0) {
            return next(new AppError("Room not found", 404));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, rows[0].hostel_id);
        }

        // Get beds in this room
        const [beds] = await pool.query<any[]>(
            "SELECT * FROM bed WHERE room_id = ? ORDER BY bed_number",
            [roomId]
        );

        res.json({
            status: "success",
            data: {
                ...rows[0],
                beds
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { floor_id, room_number, room_type, capacity, status } = req.body;
        const currentUser = (req as any).user;

        if (!floor_id || !room_number || !capacity) {
            return next(new AppError("floor_id, room_number, and capacity are required", 400));
        }

        if (Number(capacity) <= 0) {
            return next(new AppError("capacity must be greater than 0", 400));
        }

        // Verify floor existence and resolve hostel_id for scope check
        const [floor] = await pool.query<any[]>("SELECT floor_id, hostel_id FROM floor WHERE floor_id = ?", [floor_id]);
        if (floor.length === 0) return next(new AppError("Floor not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, floor[0].hostel_id);
        }

        const hostelId = floor[0].hostel_id;

        const [result] = await pool.query<any>(
            `INSERT INTO room (floor_id, hostel_id, room_number, room_type, capacity, status)
             VALUES (?, ?, ?, ?, ?, COALESCE(?, 'AVAILABLE'))`,
            [floor_id, hostelId, room_number, room_type || null, capacity, status]
        );

        const roomId = result.insertId;

        // Auto-generate beds for the room according to capacity (e.g. Bed A, Bed B, etc.)
        const bedLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const numCapacity = Number(capacity);
        for (let i = 0; i < numCapacity; i++) {
            const bedLabel = `Bed ${bedLetters[i] || (i + 1)}`;
            await pool.query(
                `INSERT INTO bed (room_id, bed_number, bed_type, status)
                 VALUES (?, ?, ?, 'AVAILABLE')
                 ON DUPLICATE KEY UPDATE status = VALUES(status)`,
                [roomId, bedLabel, room_type || 'STANDARD']
            );
        }

        res.status(201).json({
            status: "success",
            message: "Room and beds created successfully",
            data: {
                room_id: roomId,
                floor_id,
                hostel_id: hostelId,
                room_number,
                room_type,
                capacity,
                status: status || "AVAILABLE"
            }
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Room number already exists on this floor", 400));
        }
        next(error);
    }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roomId = Number(req.params.id);
        const { room_number, room_type, capacity, status } = req.body;
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>(
            `SELECT r.room_id, f.hostel_id FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE r.room_id = ?`,
            [roomId]
        );
        if (existing.length === 0) return next(new AppError("Room not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        if (capacity !== undefined) {
            if (Number(capacity) <= 0) {
                return next(new AppError("capacity must be greater than 0", 400));
            }
            // Enforce Rule 1: Capacity cannot be smaller than existing non-inactive bed count
            const [bedCount] = await pool.query<any[]>(
                "SELECT COUNT(*) as current_beds FROM bed WHERE room_id = ? AND status != 'INACTIVE'",
                [roomId]
            );
            if (bedCount[0].current_beds > Number(capacity)) {
                return next(new AppError(`Cannot set capacity to ${capacity}. Room currently has ${bedCount[0].current_beds} active beds.`, 400));
            }
        }

        await pool.query(
            `UPDATE room
             SET room_number = COALESCE(?, room_number),
                 room_type = COALESCE(?, room_type),
                 capacity = COALESCE(?, capacity),
                 status = COALESCE(?, status)
             WHERE room_id = ?`,
            [room_number, room_type, capacity, status, roomId]
        );

        res.json({
            status: "success",
            message: "Room updated successfully"
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Room number already exists on this floor", 400));
        }
        next(error);
    }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roomId = Number(req.params.id);
        const currentUser = (req as any).user;

        const hostelId = await getHostelIdFromRoom(roomId);
        if (currentUser) {
            await enforceHostelScope(currentUser, hostelId);
        }

        await pool.query("UPDATE room SET status = 'INACTIVE' WHERE room_id = ?", [roomId]);

        res.json({
            status: "success",
            message: "Room marked as INACTIVE"
        });
    } catch (error) {
        next(error);
    }
};
