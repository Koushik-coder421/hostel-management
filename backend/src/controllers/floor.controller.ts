import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope } from "../utils/scope";

export const getAllFloors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id } = req.query;
        let query = `
            SELECT f.*, h.name as hostel_name
            FROM floor f
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

        if (hostel_id) {
            query += " AND f.hostel_id = ?";
            params.push(hostel_id);
        }

        query += " ORDER BY f.hostel_id, f.floor_number";

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

export const getFloorsByHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hostelId = Number(req.params.hostelId);
        const currentUser = (req as any).user;

        if (currentUser) {
            await enforceHostelScope(currentUser, hostelId);
        }

        const [rows] = await pool.query<any[]>(
            "SELECT * FROM floor WHERE hostel_id = ? ORDER BY floor_number",
            [hostelId]
        );

        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, floor_number, name } = req.body;
        const currentUser = (req as any).user;

        if (hostel_id === undefined || floor_number === undefined) {
            return next(new AppError("hostel_id and floor_number are required", 400));
        }

        if (Number(floor_number) < 0) {
            return next(new AppError("floor_number must be greater than or equal to 0", 400));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, hostel_id);
        }

        // Verify hostel exists
        const [hostel] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (hostel.length === 0) return next(new AppError("Hostel not found", 404));

        const [result] = await pool.query<any>(
            "INSERT INTO floor (hostel_id, floor_number, name) VALUES (?, ?, ?)",
            [hostel_id, floor_number, name || `Floor ${floor_number}`]
        );

        res.status(201).json({
            status: "success",
            message: "Floor created successfully",
            data: {
                floor_id: result.insertId,
                hostel_id,
                floor_number,
                name: name || `Floor ${floor_number}`
            }
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Floor number already exists for this hostel", 400));
        }
        next(error);
    }
};

export const updateFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const floorId = Number(req.params.id);
        const { floor_number, name } = req.body;
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>("SELECT floor_id, hostel_id FROM floor WHERE floor_id = ?", [floorId]);
        if (existing.length === 0) return next(new AppError("Floor not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query(
            `UPDATE floor
             SET floor_number = COALESCE(?, floor_number),
                 name = COALESCE(?, name)
             WHERE floor_id = ?`,
            [floor_number, name, floorId]
        );

        res.json({
            status: "success",
            message: "Floor updated successfully"
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Floor number already exists for this hostel", 400));
        }
        next(error);
    }
};

export const deleteFloor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const floorId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>("SELECT floor_id, hostel_id FROM floor WHERE floor_id = ?", [floorId]);
        if (existing.length === 0) return next(new AppError("Floor not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query("DELETE FROM floor WHERE floor_id = ?", [floorId]);

        res.json({
            status: "success",
            message: "Floor deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
