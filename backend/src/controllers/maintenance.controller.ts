import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceMaintenanceSupervisorResponsibility } from "../utils/scope";

// --- Complaints ---

export const getAllComplaints = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, priority, tenant_id, target_type } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT mc.*, t.name as tenant_name, t.phone as tenant_phone
            FROM maintenance_complaint mc
            JOIN tenant t ON mc.tenant_id = t.tenant_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                // Allow complaints in scoped hostels
                query += ` AND (
                    (mc.target_type = 'ROOM' AND mc.target_id IN (SELECT r.room_id FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE f.hostel_id IN (?))) OR
                    (mc.target_type = 'BED' AND mc.target_id IN (SELECT b.bed_id FROM bed b JOIN room r ON b.room_id = r.room_id JOIN floor f ON r.floor_id = f.floor_id WHERE f.hostel_id IN (?))) OR
                    (mc.target_type = 'FACILITY' AND mc.target_id IN (SELECT facility_id FROM facility WHERE hostel_id IN (?)))
                )`;
                params.push(scope.allowedHostelIds, scope.allowedHostelIds, scope.allowedHostelIds);
            }
        }

        if (status) {
            query += " AND mc.status = ?";
            params.push(status);
        }

        if (priority) {
            query += " AND mc.priority = ?";
            params.push(priority);
        }

        if (tenant_id) {
            query += " AND mc.tenant_id = ?";
            params.push(tenant_id);
        }

        if (target_type) {
            query += " AND mc.target_type = ?";
            params.push(target_type);
        }

        query += " ORDER BY mc.complaint_id DESC";

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

export const createComplaint = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenant_id, target_type, target_id, description, priority } = req.body;

        if (!tenant_id || !target_type || !target_id || !description) {
            return next(new AppError("tenant_id, target_type, target_id, and description are required", 400));
        }

        if (!["ROOM", "BED", "FACILITY"].includes(target_type)) {
            return next(new AppError("target_type must be ROOM, BED, or FACILITY", 400));
        }

        // Verify tenant
        const [tenant] = await pool.query<any[]>("SELECT tenant_id FROM tenant WHERE tenant_id = ?", [tenant_id]);
        if (tenant.length === 0) return next(new AppError("Tenant not found", 404));

        let hostelId: number | null = null;
        if (target_type === "ROOM") {
            const [t] = await pool.query<any[]>("SELECT f.hostel_id FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE r.room_id = ?", [target_id]);
            if (t.length === 0) return next(new AppError("Room target not found", 404));
            hostelId = t[0].hostel_id;
        } else if (target_type === "BED") {
            const [t] = await pool.query<any[]>("SELECT f.hostel_id FROM bed b JOIN room r ON b.room_id = r.room_id JOIN floor f ON r.floor_id = f.floor_id WHERE b.bed_id = ?", [target_id]);
            if (t.length === 0) return next(new AppError("Bed target not found", 404));
            hostelId = t[0].hostel_id;
        } else if (target_type === "FACILITY") {
            const [t] = await pool.query<any[]>("SELECT hostel_id FROM facility WHERE facility_id = ?", [target_id]);
            if (t.length === 0) return next(new AppError("Facility target not found", 404));
            hostelId = t[0].hostel_id;
        }

        // Auto-route to assigned Maintenance Supervisor for this hostel
        let assignedSupervisor: any = null;
        if (hostelId) {
            const [supervisors] = await pool.query<any[]>(
                `SELECT s.supervisor_id, pe.name as supervisor_name, pe.email as supervisor_email, pe.phone as supervisor_phone, st.staff_id
                 FROM hostel_supervisor_assignment hsa
                 JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                 JOIN person pe ON s.person_id = pe.person_id
                 LEFT JOIN staff st ON (pe.email = st.email OR pe.phone = st.phone)
                 WHERE hsa.hostel_id = ? AND hsa.assignment_role = 'MAINTENANCE' AND hsa.is_current = TRUE
                 LIMIT 1`,
                [hostelId]
            );
            if (supervisors.length > 0) {
                assignedSupervisor = supervisors[0];
            }
        }

        const [result] = await pool.query<any>(
            `INSERT INTO maintenance_complaint (tenant_id, target_type, target_id, description, priority, status)
             VALUES (?, ?, ?, ?, COALESCE(?, 'MEDIUM'), 'OPEN')`,
            [tenant_id, target_type, target_id, description, priority]
        );

        const complaintId = result.insertId;

        // Auto-create maintenance request assigned to Maintenance Supervisor
        if (assignedSupervisor && assignedSupervisor.staff_id) {
            await pool.query(
                `INSERT INTO maintenance_request (complaint_id, raised_by, assigned_to, description, priority, status, assigned_at)
                 VALUES (?, ?, ?, ?, COALESCE(?, 'MEDIUM'), 'ASSIGNED', NOW())`,
                [complaintId, assignedSupervisor.staff_id, assignedSupervisor.staff_id, description, priority]
            );
        }

        res.status(201).json({
            status: "success",
            message: "Maintenance complaint submitted successfully and routed to Maintenance Supervisor",
            data: {
                complaint_id: complaintId,
                tenant_id,
                target_type,
                target_id,
                description,
                priority: priority || "MEDIUM",
                status: "OPEN",
                assigned_supervisor: assignedSupervisor ? assignedSupervisor.supervisor_name : "Unassigned"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateComplaintStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const complaintId = Number(req.params.id);
        const { status } = req.body;
        const currentUser = (req as any).user;

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceMaintenanceSupervisorResponsibility(scope);
        }

        if (!status || !["OPEN", "UNDER_REVIEW", "CONVERTED", "CLOSED", "REJECTED"].includes(status)) {
            return next(new AppError("Valid status required", 400));
        }

        const [existing] = await pool.query<any[]>("SELECT complaint_id FROM maintenance_complaint WHERE complaint_id = ?", [complaintId]);
        if (existing.length === 0) return next(new AppError("Complaint not found", 404));

        await pool.query("UPDATE maintenance_complaint SET status = ? WHERE complaint_id = ?", [status, complaintId]);

        res.json({
            status: "success",
            message: `Complaint status updated to ${status}`
        });
    } catch (error) {
        next(error);
    }
};

// --- Maintenance Requests ---

export const getAllRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, assigned_to } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT mr.*, mc.target_type, mc.target_id, mc.tenant_id,
                   s1.name as raised_by_staff, s2.name as assigned_to_staff
            FROM maintenance_request mr
            JOIN maintenance_complaint mc ON mr.complaint_id = mc.complaint_id
            JOIN staff s1 ON mr.raised_by = s1.staff_id
            LEFT JOIN staff s2 ON mr.assigned_to = s2.staff_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += ` AND (
                    (mc.target_type = 'ROOM' AND mc.target_id IN (SELECT r.room_id FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE f.hostel_id IN (?))) OR
                    (mc.target_type = 'BED' AND mc.target_id IN (SELECT b.bed_id FROM bed b JOIN room r ON b.room_id = r.room_id JOIN floor f ON r.floor_id = f.floor_id WHERE f.hostel_id IN (?))) OR
                    (mc.target_type = 'FACILITY' AND mc.target_id IN (SELECT facility_id FROM facility WHERE hostel_id IN (?)))
                )`;
                params.push(scope.allowedHostelIds, scope.allowedHostelIds, scope.allowedHostelIds);
            }
        }

        if (status) {
            query += " AND mr.status = ?";
            params.push(status);
        }

        if (assigned_to) {
            query += " AND mr.assigned_to = ?";
            params.push(assigned_to);
        }

        query += " ORDER BY mr.request_id DESC";

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

export const convertComplaintToRequest = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { complaint_id, assigned_to, description, priority, mark_target_under_maintenance } = req.body;
        const currentUser = (req as any).user;
        const raised_by = currentUser?.staff_id;

        if (!complaint_id) {
            return next(new AppError("complaint_id is required", 400));
        }

        if (!raised_by) {
            return next(new AppError("Staff ID not found in session", 401));
        }

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceMaintenanceSupervisorResponsibility(scope);
        }

        // 1. Fetch complaint
        const [complaints] = await connection.query<any[]>(
            "SELECT * FROM maintenance_complaint WHERE complaint_id = ?",
            [complaint_id]
        );

        if (complaints.length === 0) {
            return next(new AppError("Complaint not found", 404));
        }

        const complaint = complaints[0];

        if (["CONVERTED", "CLOSED", "REJECTED"].includes(complaint.status)) {
            return next(new AppError(`Complaint is already ${complaint.status}`, 400));
        }

        await connection.beginTransaction();

        // A. Insert maintenance request
        const assignedTime = assigned_to ? new Date() : null;
        const reqStatus = assigned_to ? "ASSIGNED" : "RAISED";

        const [reqResult] = await connection.query<any>(
            `INSERT INTO maintenance_request (
                complaint_id, raised_by, assigned_to, description, priority, status, assigned_at
            ) VALUES (?, ?, ?, ?, COALESCE(?, ?), ?, ?)`,
            [
                complaint_id,
                raised_by,
                assigned_to || null,
                description || complaint.description,
                priority || complaint.priority,
                complaint.priority,
                reqStatus,
                assignedTime
            ]
        );

        const requestId = reqResult.insertId;

        // B. Update complaint status to CONVERTED
        await connection.query(
            "UPDATE maintenance_complaint SET status = 'CONVERTED' WHERE complaint_id = ?",
            [complaint_id]
        );

        // C. Optionally update target status to MAINTENANCE if requested
        if (mark_target_under_maintenance) {
            if (complaint.target_type === "BED") {
                await connection.query("UPDATE bed SET status = 'MAINTENANCE' WHERE bed_id = ?", [complaint.target_id]);
            } else if (complaint.target_type === "ROOM") {
                await connection.query("UPDATE room SET status = 'MAINTENANCE' WHERE room_id = ?", [complaint.target_id]);
            } else if (complaint.target_type === "FACILITY") {
                await connection.query("UPDATE facility SET status = 'UNAVAILABLE' WHERE facility_id = ?", [complaint.target_id]);
            }
        }

        // D. Insert initial update log
        await connection.query(
            `INSERT INTO maintenance_update (request_id, updated_by, status, remarks)
             VALUES (?, ?, ?, 'Maintenance request created from complaint')`,
            [requestId, raised_by, reqStatus]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Complaint converted to maintenance request successfully",
            data: {
                request_id: requestId,
                complaint_id,
                assigned_to,
                status: reqStatus
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const addMaintenanceUpdate = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const requestId = Number(req.params.id);
        const { status, remarks } = req.body;
        const currentUser = (req as any).user;
        const updated_by = currentUser?.staff_id;

        if (!status || !updated_by) {
            return next(new AppError("status and authenticated staff are required", 400));
        }

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceMaintenanceSupervisorResponsibility(scope);
        }

        // Fetch request
        const [requests] = await connection.query<any[]>(
            `SELECT mr.*, mc.target_type, mc.target_id, mc.complaint_id
             FROM maintenance_request mr
             JOIN maintenance_complaint mc ON mr.complaint_id = mc.complaint_id
             WHERE mr.request_id = ?`,
            [requestId]
        );

        if (requests.length === 0) {
            return next(new AppError("Maintenance request not found", 404));
        }

        const mReq = requests[0];

        await connection.beginTransaction();

        // Insert update log
        await connection.query(
            `INSERT INTO maintenance_update (request_id, updated_by, status, remarks)
             VALUES (?, ?, ?, ?)`,
            [requestId, updated_by, status, remarks || null]
        );

        // Update request status
        const isCompleted = status === "COMPLETED";
        const completedAt = isCompleted ? new Date() : null;

        await connection.query(
            `UPDATE maintenance_request
             SET status = ?, completed_at = COALESCE(?, completed_at)
             WHERE request_id = ?`,
            [status, completedAt, requestId]
        );

        // If completed, update complaint status to CLOSED and restore target status
        if (isCompleted) {
            await connection.query(
                "UPDATE maintenance_complaint SET status = 'CLOSED' WHERE complaint_id = ?",
                [mReq.complaint_id]
            );

            // Restore target status if it was under maintenance
            if (mReq.target_type === "BED") {
                await connection.query("UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ? AND status = 'MAINTENANCE'", [mReq.target_id]);
            } else if (mReq.target_type === "ROOM") {
                await connection.query("UPDATE room SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'MAINTENANCE'", [mReq.target_id]);
            } else if (mReq.target_type === "FACILITY") {
                await connection.query("UPDATE facility SET status = 'AVAILABLE' WHERE facility_id = ? AND status = 'UNAVAILABLE'", [mReq.target_id]);
            }
        }

        await connection.commit();

        res.json({
            status: "success",
            message: `Maintenance request status updated to ${status}`
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const getRequestHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const requestId = Number(req.params.id);

        const [updates] = await pool.query<any[]>(
            `SELECT mu.*, s.name as updated_by_staff, s.role as staff_role
             FROM maintenance_update mu
             JOIN staff s ON mu.updated_by = s.staff_id
             WHERE mu.request_id = ?
             ORDER BY mu.updated_at ASC`,
            [requestId]
        );

        res.json({
            status: "success",
            results: updates.length,
            data: updates
        });
    } catch (error) {
        next(error);
    }
};
