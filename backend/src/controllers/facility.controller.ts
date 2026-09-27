import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope } from "../utils/scope";

// --- Global Facilities ---

export const getAllFacilities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, status } = req.query;
        let query = `
            SELECT f.*, h.name as hostel_name
            FROM facility f
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
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
                query += " AND (f.hostel_id IN (?) OR f.hostel_id IS NULL)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (hostel_id) {
            query += " AND (f.hostel_id = ? OR f.hostel_id IS NULL)";
            params.push(hostel_id);
        }

        if (status) {
            query += " AND f.status = ?";
            params.push(status);
        }

        query += " ORDER BY f.facility_id DESC";

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

export const createFacility = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, name, description, status } = req.body;
        const currentUser = (req as any).user;

        if (!name) {
            return next(new AppError("Facility name is required", 400));
        }

        if (hostel_id && currentUser) {
            await enforceHostelScope(currentUser, hostel_id);
        }

        if (hostel_id) {
            const [hostel] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
            if (hostel.length === 0) return next(new AppError("Hostel not found", 404));
        }

        const [result] = await pool.query<any>(
            `INSERT INTO facility (hostel_id, name, description, status)
             VALUES (?, ?, ?, COALESCE(?, 'AVAILABLE'))`,
            [hostel_id || null, name, description || null, status]
        );

        res.status(201).json({
            status: "success",
            message: "Facility added successfully",
            data: {
                facility_id: result.insertId,
                hostel_id,
                name,
                description,
                status: status || "AVAILABLE"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateFacility = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const facilityId = Number(req.params.id);
        const { name, description, status } = req.body;
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>("SELECT facility_id, hostel_id FROM facility WHERE facility_id = ?", [facilityId]);
        if (existing.length === 0) return next(new AppError("Facility not found", 404));

        if (existing[0].hostel_id && currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query(
            `UPDATE facility
             SET name = COALESCE(?, name),
                 description = COALESCE(?, description),
                 status = COALESCE(?, status)
             WHERE facility_id = ?`,
            [name, description, status, facilityId]
        );

        res.json({
            status: "success",
            message: "Facility updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteFacility = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const facilityId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>("SELECT facility_id, hostel_id FROM facility WHERE facility_id = ?", [facilityId]);
        if (existing.length === 0) return next(new AppError("Facility not found", 404));

        if (existing[0].hostel_id && currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query("UPDATE facility SET status = 'UNAVAILABLE' WHERE facility_id = ?", [facilityId]);

        res.json({
            status: "success",
            message: "Facility status set to UNAVAILABLE"
        });
    } catch (error) {
        next(error);
    }
};

// --- Hostel-Facility Assignments (hostel_facility table) ---

export const getHostelFacilities = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hostelId = Number(req.params.hostel_id);
        const currentUser = (req as any).user;

        if (currentUser) {
            await enforceHostelScope(currentUser, hostelId);
        }

        const [rows] = await pool.query<any[]>(
            `SELECT hf.*, f.name as global_facility_name, f.description as global_facility_description, h.name as hostel_name
             FROM hostel_facility hf
             JOIN facility f ON hf.facility_id = f.facility_id
             JOIN hostel h ON hf.hostel_id = h.hostel_id
             WHERE hf.hostel_id = ?
             ORDER BY hf.hostel_facility_id DESC`,
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

export const assignFacilityToHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, facility_id, location, status, available_from, available_until, remarks } = req.body;
        const currentUser = (req as any).user;

        if (!hostel_id || !facility_id) {
            return next(new AppError("hostel_id and facility_id are required", 400));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, hostel_id);
        }

        // Verify hostel and facility existence
        const [h] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (h.length === 0) return next(new AppError("Hostel not found", 404));

        const [f] = await pool.query<any[]>("SELECT facility_id, name FROM facility WHERE facility_id = ?", [facility_id]);
        if (f.length === 0) return next(new AppError("Facility not found", 404));

        // Prevent duplicate assignment
        const [existing] = await pool.query<any[]>(
            "SELECT hostel_facility_id FROM hostel_facility WHERE hostel_id = ? AND facility_id = ?",
            [hostel_id, facility_id]
        );

        if (existing.length > 0) {
            // Update existing assignment status to AVAILABLE if previously UNAVAILABLE
            await pool.query(
                `UPDATE hostel_facility
                 SET status = COALESCE(?, 'AVAILABLE'),
                     location = COALESCE(?, location),
                     remarks = COALESCE(?, remarks)
                 WHERE hostel_facility_id = ?`,
                [status, location, remarks, existing[0].hostel_facility_id]
            );

            return res.json({
                status: "success",
                message: "Hostel facility assignment updated",
                data: { hostel_facility_id: existing[0].hostel_facility_id, hostel_id, facility_id }
            });
        }

        const [result] = await pool.query<any>(
            `INSERT INTO hostel_facility (
                hostel_id, facility_id, name, location, status,
                available_from, available_until, remarks
            ) VALUES (?, ?, ?, ?, COALESCE(?, 'AVAILABLE'), ?, ?, ?)`,
            [
                hostel_id,
                facility_id,
                f[0].name,
                location || null,
                status,
                available_from || null,
                available_until || null,
                remarks || null
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Facility assigned to hostel successfully",
            data: {
                hostel_facility_id: result.insertId,
                hostel_id,
                facility_id,
                name: f[0].name,
                status: status || "AVAILABLE"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateHostelFacilityAssignment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const assignmentId = Number(req.params.id);
        const { status, location, remarks } = req.body;
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>(
            "SELECT hostel_facility_id, hostel_id FROM hostel_facility WHERE hostel_facility_id = ?",
            [assignmentId]
        );

        if (existing.length === 0) {
            return next(new AppError("Hostel facility assignment not found", 404));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query(
            `UPDATE hostel_facility
             SET status = COALESCE(?, status),
                 location = COALESCE(?, location),
                 remarks = COALESCE(?, remarks)
             WHERE hostel_facility_id = ?`,
            [status, location, remarks, assignmentId]
        );

        res.json({
            status: "success",
            message: "Hostel facility assignment updated successfully"
        });
    } catch (error) {
        next(error);
    }
};
