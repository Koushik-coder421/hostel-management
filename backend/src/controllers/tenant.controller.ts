import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceTenantAdminResponsibility } from "../utils/scope";
import bcrypt from "bcryptjs";

export const getAllTenants = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, search, hostel_id } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT DISTINCT t.*
            FROM tenant t
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            WHERE 1=1
        `;
        const params: any[] = [];

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
            query += " AND f.hostel_id = ?";
            params.push(hostel_id);
        }

        if (status) {
            query += " AND t.status = ?";
            params.push(status);
        }

        if (search) {
            query += " AND (t.name LIKE ? OR t.email LIKE ? OR t.phone LIKE ?)";
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += " ORDER BY t.tenant_id DESC";

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

export const getTenantById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);

        const [rows] = await pool.query<any[]>(
            "SELECT * FROM tenant WHERE tenant_id = ?",
            [tenantId]
        );

        if (rows.length === 0) {
            return next(new AppError("Tenant not found", 404));
        }

        // Fetch active/historical bed allocations
        const [allocations] = await pool.query<any[]>(
            `SELECT ta.*, b.bed_number, r.room_number, f.floor_number, h.name as hostel_name, s.name as allocated_by_staff
             FROM tenant_allocation ta
             JOIN bed b ON ta.bed_id = b.bed_id
             JOIN room r ON b.room_id = r.room_id
             JOIN floor f ON r.floor_id = f.floor_id
             JOIN hostel h ON f.hostel_id = h.hostel_id
             JOIN staff s ON ta.allocated_by = s.staff_id
             WHERE ta.tenant_id = ?
             ORDER BY ta.start_date DESC`,
            [tenantId]
        );

        // Fetch payment history
        const [payments] = await pool.query<any[]>(
            `SELECT p.*, s.name as recorded_by_staff
             FROM payment p
             JOIN staff s ON p.recorded_by = s.staff_id
             WHERE p.tenant_id = ?
             ORDER BY p.payment_date DESC`,
            [tenantId]
        );

        // Fetch documents
        const [documents] = await pool.query<any[]>(
            "SELECT * FROM tenant_document WHERE tenant_id = ?",
            [tenantId]
        );

        // Fetch emergency contacts
        const [emergencyContacts] = await pool.query<any[]>(
            "SELECT * FROM emergency_contact WHERE tenant_id = ?",
            [tenantId]
        );

        // Fetch preferences
        const [preferences] = await pool.query<any[]>(
            "SELECT * FROM tenant_preference WHERE tenant_id = ?",
            [tenantId]
        );

        res.json({
            status: "success",
            data: {
                ...rows[0],
                allocations,
                payments,
                documents,
                emergencyContacts,
                preferences
            }
        });
    } catch (error) {
        next(error);
    }
};

export const createTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            gender,
            date_of_birth,
            address,
            emergency_contact_name,
            emergency_contact_phone
        } = req.body;
        const currentUser = (req as any).user;

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        if (!name || !phone) {
            return next(new AppError("Name and phone number are required", 400));
        }

        const [existing] = await pool.query<any[]>(
            "SELECT tenant_id FROM tenant WHERE phone = ? OR (email IS NOT NULL AND email = ?)",
            [phone, email || null]
        );

        if (existing.length > 0) {
            return next(new AppError("Tenant with this phone or email already exists", 400));
        }

        const tenantEmail = email || `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}@tenant.com`;
        const initialPassword = password || "resident123";
        const passwordHash = await bcrypt.hash(initialPassword, 10);

        // Provision Staff Login Account for Tenant/Resident
        await pool.query(
            `INSERT INTO staff (name, email, password_hash, phone, role, status)
             VALUES (?, ?, ?, ?, 'TENANT', 'ACTIVE')
             ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'ACTIVE'`,
            [name, tenantEmail, passwordHash, phone]
        );

        // Rule 2: Creating a Tenant MUST NOT automatically create a tenant_stay
        const [result] = await pool.query<any>(
            `INSERT INTO tenant (
                name, email, phone, gender, date_of_birth, address,
                emergency_contact_name, emergency_contact_phone, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
            [
                name,
                tenantEmail,
                phone,
                gender || null,
                date_of_birth || null,
                address || null,
                emergency_contact_name || null,
                emergency_contact_phone || null
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Tenant registered successfully (stay begins upon check-in)",
            data: {
                tenant_id: result.insertId,
                name,
                email,
                phone,
                status: "ACTIVE"
            }
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Tenant email or phone already registered", 400));
        }
        next(error);
    }
};

export const updateTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);
        const currentUser = (req as any).user;

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        const {
            name,
            email,
            phone,
            gender,
            date_of_birth,
            address,
            emergency_contact_name,
            emergency_contact_phone,
            status
        } = req.body;

        const [existing] = await pool.query<any[]>("SELECT tenant_id FROM tenant WHERE tenant_id = ?", [tenantId]);
        if (existing.length === 0) return next(new AppError("Tenant not found", 404));

        await pool.query(
            `UPDATE tenant
             SET name = COALESCE(?, name),
                 email = COALESCE(?, email),
                 phone = COALESCE(?, phone),
                 gender = COALESCE(?, gender),
                 date_of_birth = COALESCE(?, date_of_birth),
                 address = COALESCE(?, address),
                 emergency_contact_name = COALESCE(?, emergency_contact_name),
                 emergency_contact_phone = COALESCE(?, emergency_contact_phone),
                 status = COALESCE(?, status)
             WHERE tenant_id = ?`,
            [
                name, email, phone, gender, date_of_birth, address,
                emergency_contact_name, emergency_contact_phone, status, tenantId
            ]
        );

        res.json({
            status: "success",
            message: "Tenant details updated successfully"
        });
    } catch (error: any) {
        if (error.code === "ER_DUP_ENTRY") {
            return next(new AppError("Tenant email or phone already registered", 400));
        }
        next(error);
    }
};

export const deleteTenant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);
        const currentUser = (req as any).user;

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        const [existing] = await pool.query<any[]>("SELECT tenant_id FROM tenant WHERE tenant_id = ?", [tenantId]);
        if (existing.length === 0) return next(new AppError("Tenant not found", 404));

        await pool.query("UPDATE tenant SET status = 'LEFT' WHERE tenant_id = ?", [tenantId]);

        res.json({
            status: "success",
            message: "Tenant status updated to LEFT"
        });
    } catch (error) {
        next(error);
    }
};

// Sub-resource endpoints
export const addTenantDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);
        const { document_type, document_number, document_path } = req.body;

        if (!document_type) return next(new AppError("document_type is required", 400));

        const [result] = await pool.query<any>(
            `INSERT INTO tenant_document (tenant_id, document_type, document_number, document_path, verification_status)
             VALUES (?, ?, ?, ?, 'PENDING')`,
            [tenantId, document_type, document_number || null, document_path || null]
        );

        res.status(201).json({
            status: "success",
            message: "Tenant document added successfully",
            data: { document_id: result.insertId, tenant_id: tenantId, document_type }
        });
    } catch (error) {
        next(error);
    }
};

export const addEmergencyContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);
        const { name, relationship, phone, address, is_primary } = req.body;

        if (!name || !phone) return next(new AppError("Name and phone are required", 400));

        const [result] = await pool.query<any>(
            `INSERT INTO emergency_contact (tenant_id, name, relationship, phone, address, is_primary)
             VALUES (?, ?, ?, ?, ?, COALESCE(?, TRUE))`,
            [tenantId, name, relationship || null, phone, address || null, is_primary]
        );

        res.status(201).json({
            status: "success",
            message: "Emergency contact added successfully",
            data: { contact_id: result.insertId, tenant_id: tenantId, name, phone }
        });
    } catch (error) {
        next(error);
    }
};

export const addTenantPreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenantId = Number(req.params.id);
        const { preferred_sharing_type, remarks } = req.body;

        const [result] = await pool.query<any>(
            `INSERT INTO tenant_preference (tenant_id, preferred_sharing_type, remarks)
             VALUES (?, ?, ?)`,
            [tenantId, preferred_sharing_type || null, remarks || null]
        );

        res.status(201).json({
            status: "success",
            message: "Tenant preference recorded successfully",
            data: { preference_id: result.insertId, tenant_id: tenantId }
        });
    } catch (error) {
        next(error);
    }
};
