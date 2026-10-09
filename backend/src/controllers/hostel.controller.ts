import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";

async function ensureHostelColumns() {
    try {
        await pool.query("ALTER TABLE hostel ADD COLUMN deactivation_reason VARCHAR(255) NULL");
    } catch {
        // column already exists
    }
}

export const getAllHostels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureHostelColumns();
        const { status } = req.query;
        let query = "SELECT * FROM hostel WHERE 1=1";
        const params: any[] = [];

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY hostel_id";

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

export const getHostelById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureHostelColumns();
        const hostelId = Number(req.params.id);

        const [rows] = await pool.query<any[]>(
            "SELECT * FROM hostel WHERE hostel_id = ?",
            [hostelId]
        );

        if (rows.length === 0) {
            return next(new AppError("Hostel not found", 404));
        }

        // Fetch active Partner assignment
        const [partner] = await pool.query<any[]>(
            `SELECT p.partner_id, pe.name, pe.email, pe.phone, pha.start_date
             FROM partner_hostel_assignment pha
             JOIN partner p ON pha.partner_id = p.partner_id
             JOIN person pe ON p.person_id = pe.person_id
             WHERE pha.hostel_id = ? AND pha.is_current = TRUE`,
            [hostelId]
        );

        // Fetch active Manager assignment
        const [manager] = await pool.query<any[]>(
            `SELECT m.manager_id, pe.name, pe.email, pe.phone, mha.start_date
             FROM manager_hostel_assignment mha
             JOIN manager m ON mha.manager_id = m.manager_id
             JOIN person pe ON m.person_id = pe.person_id
             WHERE mha.hostel_id = ? AND mha.is_current = TRUE`,
            [hostelId]
        );

        // Fetch active Supervisors (Tenant Admin & Maintenance)
        const [supervisors] = await pool.query<any[]>(
            `SELECT s.supervisor_id, pe.name, pe.email, pe.phone, hsa.assignment_role, hsa.start_date
             FROM hostel_supervisor_assignment hsa
             JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
             JOIN person pe ON s.person_id = pe.person_id
             WHERE hsa.hostel_id = ? AND hsa.is_current = TRUE`,
            [hostelId]
        );

        // Get floors count, rooms count, total beds, occupied beds
        const [stats] = await pool.query<any[]>(
            `SELECT
                COUNT(DISTINCT f.floor_id) as total_floors,
                COUNT(DISTINCT r.room_id) as total_rooms,
                COUNT(DISTINCT b.bed_id) as total_beds,
                SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_beds
             FROM hostel h
             LEFT JOIN floor f ON h.hostel_id = f.hostel_id
             LEFT JOIN room r ON f.floor_id = r.floor_id
             LEFT JOIN bed b ON r.room_id = b.room_id
             WHERE h.hostel_id = ?`,
            [hostelId]
        );

        res.json({
            status: "success",
            data: {
                ...rows[0],
                assigned_partner: partner[0] || null,
                assigned_manager: manager[0] || null,
                assigned_supervisors: supervisors,
                stats: stats[0]
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createHostel = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        await ensureHostelColumns();
        const {
            name,
            address,
            contact_number,
            hostel_code,
            partner_id
        } = req.body;

        if (!name || !address) {
            return next(new AppError("Name and address are required", 400));
        }

        const generatedCode = hostel_code || `HSTL-${Math.floor(1000 + Math.random() * 9000)}`;

        await connection.beginTransaction();

        let assignedPartnerId: number | null = null;

        if (partner_id) {
            const [pCheck] = await connection.query<any[]>(
                "SELECT partner_id FROM partner WHERE partner_id = ? AND is_active = TRUE",
                [partner_id]
            );
            if (pCheck.length === 0) {
                await connection.rollback();
                return next(new AppError("Specified Partner not found or inactive", 400));
            }
            assignedPartnerId = Number(partner_id);
        } else {
            const [leastLoadedPartner] = await connection.query<any[]>(
                `SELECT p.partner_id, COUNT(pha.hostel_id) as hostel_count
                 FROM partner p
                 LEFT JOIN partner_hostel_assignment pha ON p.partner_id = pha.partner_id AND pha.is_current = TRUE
                 WHERE p.is_active = TRUE
                 GROUP BY p.partner_id
                 ORDER BY hostel_count ASC, p.partner_id ASC
                 LIMIT 1`
            );

            if (leastLoadedPartner.length > 0) {
                assignedPartnerId = leastLoadedPartner[0].partner_id;
            }
        }

        const [result] = await connection.query<any>(
            `INSERT INTO hostel (hostel_code, name, address, contact_number, status)
             VALUES (?, ?, ?, ?, 'ACTIVE')`,
            [generatedCode, name, address, contact_number || null]
        );

        const hostelId = result.insertId;
        const startDate = new Date().toISOString().slice(0, 10);

        if (assignedPartnerId) {
            await connection.query(
                `INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, ?, TRUE)`,
                [assignedPartnerId, hostelId, startDate]
            );
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Hostel created successfully",
            data: {
                hostel_id: hostelId,
                hostel_code: generatedCode,
                name,
                address,
                contact_number: contact_number || null,
                assigned_partner_id: assignedPartnerId,
                status: "ACTIVE"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const updateHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureHostelColumns();
        const hostelId = Number(req.params.id);
        const { name, address, contact_number, status, deactivation_reason } = req.body;

        const [existing] = await pool.query<any[]>(
            "SELECT hostel_id FROM hostel WHERE hostel_id = ?",
            [hostelId]
        );

        if (existing.length === 0) {
            return next(new AppError("Hostel not found", 404));
        }

        await pool.query(
            `UPDATE hostel
             SET name = COALESCE(?, name),
                 address = COALESCE(?, address),
                 contact_number = COALESCE(?, contact_number),
                 status = COALESCE(?, status)
             WHERE hostel_id = ?`,
            [name, address, contact_number, status, hostelId]
        );

        if (status === "ACTIVE") {
            await pool.query("UPDATE hostel SET deactivation_reason = NULL WHERE hostel_id = ?", [hostelId]);
        } else if (status === "INACTIVE" && deactivation_reason !== undefined) {
            await pool.query("UPDATE hostel SET deactivation_reason = ? WHERE hostel_id = ?", [deactivation_reason, hostelId]);
        }

        res.json({
            status: "success",
            message: "Hostel updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureHostelColumns();
        const hostelId = Number(req.params.id);
        const { deactivation_reason } = req.body || {};

        const [existing] = await pool.query<any[]>(
            "SELECT hostel_id FROM hostel WHERE hostel_id = ?",
            [hostelId]
        );

        if (existing.length === 0) {
            return next(new AppError("Hostel not found", 404));
        }

        await pool.query("UPDATE hostel SET status = 'INACTIVE', deactivation_reason = ? WHERE hostel_id = ?", [deactivation_reason || "Deactivated by administrator", hostelId]);

        res.json({
            status: "success",
            message: "Hostel status set to INACTIVE"
        });
    } catch (error) {
        next(error);
    }
};