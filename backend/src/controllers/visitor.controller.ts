import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope } from "../utils/scope";

export const getAllVisitors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search } = req.query;
        const currentUser = (req as any).user;

        let query = "SELECT DISTINCT v.* FROM visitor v WHERE 1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND v.visitor_id IN (SELECT DISTINCT visitor_id FROM visit WHERE hostel_id IN (?))";
                params.push(scope.allowedHostelIds);
            }
        }

        if (search) {
            query += " AND (v.name LIKE ? OR v.phone LIKE ? OR v.id_number LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += " ORDER BY v.visitor_id DESC";

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

export const createVisitor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, phone, id_type, id_number } = req.body;

        if (!name || !phone) {
            return next(new AppError("Visitor name and phone number are required", 400));
        }

        const [result] = await pool.query<any>(
            `INSERT INTO visitor (name, phone, id_type, id_number)
             VALUES (?, ?, ?, ?)`,
            [name, phone, id_type || null, id_number || null]
        );

        res.status(201).json({
            status: "success",
            message: "Visitor registered successfully",
            data: {
                visitor_id: result.insertId,
                name,
                phone,
                id_type,
                id_number
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAllVisits = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, status, visitor_id } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT v.*, vis.name as visitor_name, vis.phone as visitor_phone, vis.id_type, vis.id_number,
                   h.name as hostel_name, s.name as verified_by_staff
            FROM visit v
            JOIN visitor vis ON v.visitor_id = vis.visitor_id
            JOIN hostel h ON v.hostel_id = h.hostel_id
            LEFT JOIN staff s ON v.verified_by = s.staff_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND v.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (hostel_id) {
            query += " AND v.hostel_id = ?";
            params.push(hostel_id);
        }

        if (status) {
            query += " AND v.status = ?";
            params.push(status);
        }

        if (visitor_id) {
            query += " AND v.visitor_id = ?";
            params.push(visitor_id);
        }

        query += " ORDER BY v.check_in DESC";

        const [rows] = await pool.query<any[]>(query, params);

        // Fetch visited tenants for each visit
        for (const visit of rows) {
            const [tenants] = await pool.query<any[]>(
                `SELECT vt.tenant_id, vt.relationship, vt.remarks, t.name as tenant_name, t.phone as tenant_phone
                 FROM visit_tenant vt
                 JOIN tenant t ON vt.tenant_id = t.tenant_id
                 WHERE vt.visit_id = ?`,
                [visit.visit_id]
            );
            visit.visited_tenants = tenants;
        }

        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const logVisit = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const {
            visitor_id,
            hostel_id,
            purpose,
            check_in,
            tenants // Array of { tenant_id, relationship, remarks }
        } = req.body;
        const currentUser = (req as any).user;
        const verified_by = currentUser?.staff_id;

        if (!visitor_id || !hostel_id) {
            return next(new AppError("visitor_id and hostel_id are required", 400));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, hostel_id);
        }

        const checkInTime = check_in || new Date();

        // 1. Verify visitor and hostel existence
        const [vis] = await connection.query<any[]>("SELECT visitor_id FROM visitor WHERE visitor_id = ?", [visitor_id]);
        if (vis.length === 0) return next(new AppError("Visitor not found", 404));

        const [hos] = await connection.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (hos.length === 0) return next(new AppError("Hostel not found", 404));

        // 2. If tenants list is provided, verify all tenants belong to this hostel via active allocation
        if (tenants && Array.isArray(tenants) && tenants.length > 0) {
            for (const t of tenants) {
                const [alloc] = await connection.query<any[]>(
                    `SELECT ta.allocation_id
                     FROM tenant_allocation ta
                     JOIN bed b ON ta.bed_id = b.bed_id
                     JOIN room r ON b.room_id = r.room_id
                     JOIN floor f ON r.floor_id = f.floor_id
                     WHERE ta.tenant_id = ? AND ta.status = 'ACTIVE' AND f.hostel_id = ?`,
                    [t.tenant_id, hostel_id]
                );

                if (alloc.length === 0) {
                    return next(
                        new AppError(
                            `Tenant ID ${t.tenant_id} does not have an active allocation in hostel ID ${hostel_id}`,
                            400
                        )
                    );
                }
            }
        }

        await connection.beginTransaction();

        // A. Insert visit record
        const [visitResult] = await connection.query<any>(
            `INSERT INTO visit (visitor_id, hostel_id, purpose, check_in, status, verified_by)
             VALUES (?, ?, ?, ?, 'CHECKED_IN', ?)`,
            [visitor_id, hostel_id, purpose || null, checkInTime, verified_by || null]
        );

        const visitId = visitResult.insertId;

        // B. Insert visit_tenant relationships
        if (tenants && Array.isArray(tenants)) {
            for (const t of tenants) {
                await connection.query(
                    `INSERT INTO visit_tenant (visit_id, tenant_id, relationship, remarks)
                     VALUES (?, ?, ?, ?)`,
                    [visitId, t.tenant_id, t.relationship || null, t.remarks || null]
                );
            }
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Visit logged and checked in successfully",
            data: {
                visit_id: visitId,
                visitor_id,
                hostel_id,
                status: "CHECKED_IN",
                check_in: checkInTime,
                verified_by
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const checkOutVisit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const visitId = Number(req.params.id);
        const { check_out } = req.body;
        const currentUser = (req as any).user;
        const checkOutTime = check_out || new Date();

        const [visits] = await pool.query<any[]>(
            "SELECT * FROM visit WHERE visit_id = ?",
            [visitId]
        );

        if (visits.length === 0) {
            return next(new AppError("Visit record not found", 404));
        }

        const visit = visits[0];

        if (currentUser) {
            await enforceHostelScope(currentUser, visit.hostel_id);
        }

        if (visit.status === "CHECKED_OUT") {
            return next(new AppError("Visit is already checked out", 400));
        }

        const checkInTimeObj = typeof visit.check_in === "string" 
            ? new Date(visit.check_in.replace(" ", "T")) 
            : new Date(visit.check_in);
        const checkOutTimeObj = new Date(checkOutTime);

        if (checkOutTimeObj.getTime() < checkInTimeObj.getTime() - 60000) {
            return next(new AppError("check_out time cannot be earlier than check_in time", 400));
        }

        await pool.query(
            `UPDATE visit
             SET status = 'CHECKED_OUT', check_out = ?
             WHERE visit_id = ?`,
            [checkOutTime, visitId]
        );

        res.json({
            status: "success",
            message: "Visitor checked out successfully",
            data: {
                visit_id: visitId,
                status: "CHECKED_OUT",
                check_out: checkOutTime
            }
        });
    } catch (error) {
        next(error);
    }
};
