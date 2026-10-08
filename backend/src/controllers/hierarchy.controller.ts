import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";

/**
 * 1. Create Head User (Superadmin / Admin)
 */
export const createHead = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return next(new AppError("Name, email, and password are required", 400));
        }

        // Check if email or phone exists in person or staff
        const [existingStaff] = await connection.query<any[]>(
            "SELECT staff_id FROM staff WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [email, phone || null]
        );
        if (existingStaff.length > 0) {
            return next(new AppError("Email or phone already registered in staff", 400));
        }

        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().slice(0, 10);

        // 1. Insert into person
        const [personResult] = await connection.query<any>(
            "INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)",
            [name, email, phone || null]
        );
        const personId = personResult.insertId;

        // 2. Insert into head
        const [headResult] = await connection.query<any>(
            "INSERT INTO head (person_id, is_active) VALUES (?, TRUE)",
            [personId]
        );
        const headId = headResult.insertId;

        // 3. Insert into staff for login
        const [staffResult] = await connection.query<any>(
            "INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'HEAD', 'ACTIVE')",
            [name, email, passwordHash, phone || null]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Head created successfully",
            data: {
                head_id: headId,
                person_id: personId,
                staff_id: staffResult.insertId,
                name,
                email,
                phone: phone || null,
                role: "HEAD"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * 2. Create Partner User (Superadmin / Admin / Head)
 */
export const createPartner = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { name, email, password, phone, head_id } = req.body;
        const currentUser = (req as any).user;

        if (!name || !email || !password) {
            return next(new AppError("Name, email, and password are required", 400));
        }

        const [existingStaff] = await connection.query<any[]>(
            "SELECT staff_id FROM staff WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [email, phone || null]
        );
        if (existingStaff.length > 0) {
            return next(new AppError("Email or phone already registered", 400));
        }

        let effectiveHeadId = head_id ? Number(head_id) : null;

        // If logged-in user is a HEAD, resolve their head_id
        if (currentUser.role === "HEAD" && !effectiveHeadId) {
            const [hRec] = await connection.query<any[]>(
                `SELECT h.head_id FROM head h JOIN person pe ON h.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            if (hRec.length > 0) {
                effectiveHeadId = hRec[0].head_id;
            }
        }

        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().slice(0, 10);

        // 1. Person
        const [personResult] = await connection.query<any>(
            "INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)",
            [name, email, phone || null]
        );
        const personId = personResult.insertId;

        // 2. Partner
        const [partnerResult] = await connection.query<any>(
            "INSERT INTO partner (person_id, is_active) VALUES (?, TRUE)",
            [personId]
        );
        const partnerId = partnerResult.insertId;

        // 3. Staff login
        const [staffResult] = await connection.query<any>(
            "INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'PARTNER', 'ACTIVE')",
            [name, email, passwordHash, phone || null]
        );

        // 4. Assign Head if available
        if (effectiveHeadId) {
            await connection.query(
                "INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
                [effectiveHeadId, partnerId, startDate]
            );
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Partner created successfully",
            data: {
                partner_id: partnerId,
                head_id: effectiveHeadId,
                person_id: personId,
                staff_id: staffResult.insertId,
                name,
                email,
                phone: phone || null,
                role: "PARTNER"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * 3. Create Manager User under a Partner (Superadmin / Admin / Head / Partner)
 */
export const createManager = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { name, email, password, phone, partner_id } = req.body;
        const currentUser = (req as any).user;

        if (!name || !email || !password) {
            return next(new AppError("Name, email, and password are required", 400));
        }

        let targetPartnerId = partner_id ? Number(partner_id) : null;

        // If creator is PARTNER, resolve their own partner_id automatically
        if (currentUser.role === "PARTNER") {
            const [pRec] = await connection.query<any[]>(
                `SELECT p.partner_id FROM partner p JOIN person pe ON p.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            if (pRec.length > 0) {
                targetPartnerId = pRec[0].partner_id;
            }
        }

        if (!targetPartnerId) {
            return next(new AppError("partner_id is required to create a manager under a partner", 400));
        }

        // Verify partner exists
        const [partnerCheck] = await connection.query<any[]>(
            "SELECT partner_id FROM partner WHERE partner_id = ?",
            [targetPartnerId]
        );
        if (partnerCheck.length === 0) {
            return next(new AppError("Specified Partner not found", 404));
        }

        const [existingStaff] = await connection.query<any[]>(
            "SELECT staff_id FROM staff WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [email, phone || null]
        );
        if (existingStaff.length > 0) {
            return next(new AppError("Email or phone already registered", 400));
        }

        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().slice(0, 10);

        // 1. Person
        const [personResult] = await connection.query<any>(
            "INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)",
            [name, email, phone || null]
        );
        const personId = personResult.insertId;

        // 2. Manager
        const [managerResult] = await connection.query<any>(
            "INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)",
            [personId]
        );
        const managerId = managerResult.insertId;

        // 3. Staff login
        const [staffResult] = await connection.query<any>(
            "INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'MANAGER', 'ACTIVE')",
            [name, email, passwordHash, phone || null]
        );

        // 4. Assign Partner -> Manager (partner_id stored in assignment table)
        await connection.query(
            "INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
            [targetPartnerId, managerId, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Manager created under partner successfully",
            data: {
                manager_id: managerId,
                partner_id: targetPartnerId,
                person_id: personId,
                staff_id: staffResult.insertId,
                name,
                email,
                phone: phone || null,
                role: "MANAGER"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * 4. Create Supervisor User under a Manager (Superadmin / Admin / Head / Partner / Manager)
 */
export const createSupervisor = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { name, email, password, phone, manager_id, hostel_id, assignment_role } = req.body;
        const currentUser = (req as any).user;

        if (!name || !email || !password) {
            return next(new AppError("Name, email, and password are required", 400));
        }

        let targetManagerId = manager_id ? Number(manager_id) : null;

        // If creator is MANAGER, resolve their own manager_id automatically
        if (currentUser.role === "MANAGER") {
            const [mRec] = await connection.query<any[]>(
                `SELECT m.manager_id FROM manager m JOIN person pe ON m.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            if (mRec.length > 0) {
                targetManagerId = mRec[0].manager_id;
            }
        }

        if (!targetManagerId) {
            return next(new AppError("manager_id is required to create a supervisor under a manager", 400));
        }

        // Verify manager exists
        const [managerCheck] = await connection.query<any[]>(
            "SELECT manager_id FROM manager WHERE manager_id = ?",
            [targetManagerId]
        );
        if (managerCheck.length === 0) {
            return next(new AppError("Specified Manager not found", 404));
        }

        const [existingStaff] = await connection.query<any[]>(
            "SELECT staff_id FROM staff WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [email, phone || null]
        );
        if (existingStaff.length > 0) {
            return next(new AppError("Email or phone already registered", 400));
        }

        await connection.beginTransaction();

        const passwordHash = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().slice(0, 10);

        // 1. Person
        const [personResult] = await connection.query<any>(
            "INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)",
            [name, email, phone || null]
        );
        const personId = personResult.insertId;

        // 2. Supervisor
        const [supervisorResult] = await connection.query<any>(
            "INSERT INTO supervisor (person_id, is_active) VALUES (?, TRUE)",
            [personId]
        );
        const supervisorId = supervisorResult.insertId;

        // 3. Staff login
        const [staffResult] = await connection.query<any>(
            "INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'SUPERVISOR', 'ACTIVE')",
            [name, email, passwordHash, phone || null]
        );

        // 4. Assign Hostel if provided
        let targetHostelId = hostel_id ? Number(hostel_id) : null;
        if (!targetHostelId) {
            // Find first hostel assigned to this manager if not specified
            const [mHostel] = await connection.query<any[]>(
                "SELECT hostel_id FROM manager_hostel_assignment WHERE manager_id = ? AND is_current = TRUE LIMIT 1",
                [targetManagerId]
            );
            if (mHostel.length > 0) {
                targetHostelId = mHostel[0].hostel_id;
            }
        }

        if (targetHostelId) {
            const roleType = assignment_role || "TENANT_ADMIN";
            // Enforce Strict 2-Supervisors-Per-Hostel Division Rule (1 TENANT_ADMIN, 1 MAINTENANCE)
            await connection.query(
                `UPDATE hostel_supervisor_assignment
                 SET is_current = FALSE, end_date = ?
                 WHERE hostel_id = ? AND assignment_role = ? AND is_current = TRUE`,
                [startDate, targetHostelId, roleType]
            );

            await connection.query(
                `INSERT INTO hostel_supervisor_assignment (hostel_id, supervisor_id, assignment_role, start_date, is_current)
                 VALUES (?, ?, ?, ?, TRUE)`,
                [targetHostelId, supervisorId, roleType, startDate]
            );
            // Also link staff to hostel
            await connection.query(
                `INSERT INTO hostel_staff (hostel_id, staff_id, assigned_from) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE assigned_from = VALUES(assigned_from)`,
                [targetHostelId, staffResult.insertId, startDate]
            );
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Supervisor created under manager successfully",
            data: {
                supervisor_id: supervisorId,
                manager_id: targetManagerId,
                hostel_id: targetHostelId,
                person_id: personId,
                staff_id: staffResult.insertId,
                name,
                email,
                phone: phone || null,
                role: "SUPERVISOR"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * 5. Get Role-Based Dashboard Data
 */
export const getRoleDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        const role = currentUser.role;

        // SUPERADMIN / ADMIN / HEAD
        if (role === "SUPERADMIN" || role === "ADMIN" || role === "HEAD") {
            const [[{ total_heads }]] = await pool.query<any[]>("SELECT COUNT(*) as total_heads FROM head WHERE is_active = TRUE");
            const [[{ total_partners }]] = await pool.query<any[]>("SELECT COUNT(*) as total_partners FROM partner WHERE is_active = TRUE");
            const [[{ total_managers }]] = await pool.query<any[]>("SELECT COUNT(*) as total_managers FROM manager WHERE is_active = TRUE");
            const [[{ total_supervisors }]] = await pool.query<any[]>("SELECT COUNT(*) as total_supervisors FROM supervisor WHERE is_active = TRUE");
            const [[{ total_hostels }]] = await pool.query<any[]>("SELECT COUNT(*) as total_hostels FROM hostel WHERE status = 'ACTIVE'");
            const [[{ total_beds }]] = await pool.query<any[]>("SELECT COUNT(*) as total_beds FROM bed");
            const [[{ occupied_beds }]] = await pool.query<any[]>("SELECT COUNT(*) as occupied_beds FROM bed WHERE status = 'OCCUPIED'");
            const [[{ total_tenants }]] = await pool.query<any[]>("SELECT COUNT(*) as total_tenants FROM tenant WHERE status = 'ACTIVE'");
            const [[{ total_revenue }]] = await pool.query<any[]>("SELECT COALESCE(SUM(amount), 0) as total_revenue FROM payment WHERE status = 'SUCCESS'");

            const [partnersList] = await pool.query<any[]>(
                `SELECT p.partner_id, pe.name, pe.email, pe.phone,
                        COUNT(DISTINCT pma.manager_id) as manager_count,
                        COUNT(DISTINCT pha.hostel_id) as hostel_count
                 FROM partner p
                 JOIN person pe ON p.person_id = pe.person_id
                 LEFT JOIN partner_manager_assignment pma ON p.partner_id = pma.partner_id AND pma.is_current = TRUE
                 LEFT JOIN partner_hostel_assignment pha ON p.partner_id = pha.partner_id AND pha.is_current = TRUE
                 WHERE p.is_active = TRUE
                 GROUP BY p.partner_id, pe.name, pe.email, pe.phone`
            );

            return res.json({
                status: "success",
                data: {
                    role: role,
                    metrics: {
                        total_heads,
                        total_partners,
                        total_managers,
                        total_supervisors,
                        total_hostels,
                        total_beds,
                        occupied_beds,
                        occupancy_rate: total_beds > 0 ? ((occupied_beds / total_beds) * 100).toFixed(1) + "%" : "0%",
                        total_tenants,
                        total_revenue
                    },
                    partners: partnersList
                }
            });
        }

        // PARTNER
        if (role === "PARTNER") {
            const [pRec] = await pool.query<any[]>(
                `SELECT p.partner_id, pe.name FROM partner p JOIN person pe ON p.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const partnerId = pRec[0]?.partner_id;

            if (!partnerId) {
                return next(new AppError("Partner record not found for this logged-in account", 404));
            }

            // Fetch Managers under this partner
            const [managers] = await pool.query<any[]>(
                `SELECT m.manager_id, pe.name, pe.email, pe.phone, pma.start_date
                 FROM partner_manager_assignment pma
                 JOIN manager m ON pma.manager_id = m.manager_id
                 JOIN person pe ON m.person_id = pe.person_id
                 WHERE pma.partner_id = ? AND pma.is_current = TRUE`,
                [partnerId]
            );

            // Fetch Hostels under this partner
            const [hostels] = await pool.query<any[]>(
                `SELECT h.hostel_id, h.hostel_code, h.name, h.address, pha.start_date
                 FROM partner_hostel_assignment pha
                 JOIN hostel h ON pha.hostel_id = h.hostel_id
                 WHERE pha.partner_id = ? AND pha.is_current = TRUE`,
                [partnerId]
            );

            const hostelIds = hostels.map((h: any) => h.hostel_id);

            let totalBeds = 0;
            let occupiedBeds = 0;
            let totalRevenue = 0;

            if (hostelIds.length > 0) {
                const [[{ beds }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as beds FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?)`,
                    [hostelIds]
                );
                const [[{ occ }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as occ FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?) AND b.status = 'OCCUPIED'`,
                    [hostelIds]
                );
                const [[{ rev }]] = await pool.query<any[]>(
                    `SELECT COALESCE(SUM(p.amount), 0) as rev FROM payment p
                     JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
                     JOIN bed b ON ta.bed_id = b.bed_id
                     JOIN room r ON b.room_id = r.room_id
                     WHERE r.hostel_id IN (?) AND p.status = 'SUCCESS'`,
                    [hostelIds]
                );
                totalBeds = beds;
                occupiedBeds = occ;
                totalRevenue = rev;
            }

            return res.json({
                status: "success",
                data: {
                    role: role,
                    partner_id: partnerId,
                    metrics: {
                        total_managers: managers.length,
                        total_hostels: hostels.length,
                        total_beds: totalBeds,
                        occupied_beds: occupiedBeds,
                        occupancy_rate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + "%" : "0%",
                        total_revenue: totalRevenue
                    },
                    managers,
                    hostels
                }
            });
        }

        // MANAGER
        if (role === "MANAGER") {
            const [mRec] = await pool.query<any[]>(
                `SELECT m.manager_id, pe.name FROM manager m JOIN person pe ON m.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const managerId = mRec[0]?.manager_id;

            if (!managerId) {
                return next(new AppError("Manager record not found for this logged-in account", 404));
            }

            // Get Parent Partner
            const [parentPartner] = await pool.query<any[]>(
                `SELECT p.partner_id, pe.name as partner_name
                 FROM partner_manager_assignment pma
                 JOIN partner p ON pma.partner_id = p.partner_id
                 JOIN person pe ON p.person_id = pe.person_id
                 WHERE pma.manager_id = ? AND pma.is_current = TRUE`,
                [managerId]
            );

            // Fetch Hostels under this Manager
            const [hostels] = await pool.query<any[]>(
                `SELECT h.hostel_id, h.hostel_code, h.name, h.address, mha.start_date
                 FROM manager_hostel_assignment mha
                 JOIN hostel h ON mha.hostel_id = h.hostel_id
                 WHERE mha.manager_id = ? AND mha.is_current = TRUE`,
                [managerId]
            );

            // Fetch Supervisors under this Manager's Hostels
            const [supervisors] = await pool.query<any[]>(
                `SELECT DISTINCT s.supervisor_id, pe.name, pe.email, pe.phone, hsa.assignment_role, h.name as hostel_name
                 FROM manager_hostel_assignment mha
                 JOIN hostel_supervisor_assignment hsa ON mha.hostel_id = hsa.hostel_id
                 JOIN hostel h ON hsa.hostel_id = h.hostel_id
                 JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                 JOIN person pe ON s.person_id = pe.person_id
                 WHERE mha.manager_id = ? AND mha.is_current = TRUE AND hsa.is_current = TRUE`,
                [managerId]
            );

            const hostelIds = hostels.map((h: any) => h.hostel_id);

            let totalBeds = 0;
            let occupiedBeds = 0;
            let totalRevenue = 0;

            if (hostelIds.length > 0) {
                const [[{ beds }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as beds FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?)`,
                    [hostelIds]
                );
                const [[{ occ }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as occ FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?) AND b.status = 'OCCUPIED'`,
                    [hostelIds]
                );
                const [[{ rev }]] = await pool.query<any[]>(
                    `SELECT COALESCE(SUM(p.amount), 0) as rev FROM payment p
                     JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
                     JOIN bed b ON ta.bed_id = b.bed_id
                     JOIN room r ON b.room_id = r.room_id
                     WHERE r.hostel_id IN (?) AND p.status = 'SUCCESS'`,
                    [hostelIds]
                );
                totalBeds = beds;
                occupiedBeds = occ;
                totalRevenue = rev;
            }

            return res.json({
                status: "success",
                data: {
                    role: role,
                    manager_id: managerId,
                    parent_partner: parentPartner[0] || null,
                    metrics: {
                        total_supervisors: supervisors.length,
                        total_hostels: hostels.length,
                        total_beds: totalBeds,
                        occupied_beds: occupiedBeds,
                        occupancy_rate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + "%" : "0%",
                        total_revenue: totalRevenue
                    },
                    supervisors,
                    hostels
                }
            });
        }

        // SUPERVISOR
        if (role === "SUPERVISOR") {
            const [sRec] = await pool.query<any[]>(
                `SELECT s.supervisor_id, pe.name FROM supervisor s JOIN person pe ON s.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [currentUser.email, currentUser.phone]
            );
            const supervisorId = sRec[0]?.supervisor_id;

            // Fetch Assigned Hostels
            const [hostels] = await pool.query<any[]>(
                `SELECT h.hostel_id, h.name, h.address, hsa.assignment_role
                 FROM hostel_supervisor_assignment hsa
                 JOIN hostel h ON hsa.hostel_id = h.hostel_id
                 WHERE hsa.supervisor_id = ? AND hsa.is_current = TRUE`,
                [supervisorId || 0]
            );

            // Get Parent Manager via hostel linkage
            const [parentManager] = await pool.query<any[]>(
                `SELECT DISTINCT m.manager_id, pe.name as manager_name
                 FROM hostel_supervisor_assignment hsa
                 JOIN manager_hostel_assignment mha ON hsa.hostel_id = mha.hostel_id AND mha.is_current = TRUE
                 JOIN manager m ON mha.manager_id = m.manager_id
                 JOIN person pe ON m.person_id = pe.person_id
                 WHERE hsa.supervisor_id = ? AND hsa.is_current = TRUE`,
                [supervisorId || 0]
            );

            const hostelIds = hostels.map((h: any) => h.hostel_id);
            let totalBeds = 0;
            let occupiedBeds = 0;

            if (hostelIds.length > 0) {
                const [[{ beds }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as beds FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?)`,
                    [hostelIds]
                );
                const [[{ occ }]] = await pool.query<any[]>(
                    `SELECT COUNT(b.bed_id) as occ FROM bed b JOIN room r ON b.room_id = r.room_id WHERE r.hostel_id IN (?) AND b.status = 'OCCUPIED'`,
                    [hostelIds]
                );
                totalBeds = beds;
                occupiedBeds = occ;
            }

            return res.json({
                status: "success",
                data: {
                    role: role,
                    supervisor_id: supervisorId || null,
                    parent_manager: parentManager[0] || null,
                    metrics: {
                        assigned_hostels_count: hostels.length,
                        total_beds: totalBeds,
                        occupied_beds: occupiedBeds,
                        occupancy_rate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + "%" : "0%"
                    },
                    hostels
                }
            });
        }

        return next(new AppError("Invalid role for dashboard", 400));
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: List all partners
 */
export const listPartners = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [rows] = await pool.query<any[]>(
            `SELECT p.partner_id, pe.name, pe.email, pe.phone, p.is_active, st.staff_id, COALESCE(st.status, CASE WHEN p.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END) as status
             FROM partner p
             JOIN person pe ON p.person_id = pe.person_id
             LEFT JOIN staff st ON (pe.email = st.email OR pe.phone = st.phone)
             ORDER BY p.partner_id DESC`
        );
        res.json({ status: "success", results: rows.length, data: rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: List all managers (optionally filter by partner_id)
 */
export const listManagers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { partner_id } = req.query;
        let query = `
            SELECT m.manager_id, pe.name, pe.email, pe.phone, m.is_active, pma.partner_id, partner_pe.name as partner_name, st.staff_id, COALESCE(st.status, CASE WHEN m.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END) as status
            FROM manager m
            JOIN person pe ON m.person_id = pe.person_id
            LEFT JOIN staff st ON (pe.email = st.email OR pe.phone = st.phone)
            LEFT JOIN partner_manager_assignment pma ON m.manager_id = pma.manager_id AND pma.is_current = TRUE
            LEFT JOIN partner p ON pma.partner_id = p.partner_id
            LEFT JOIN person partner_pe ON p.person_id = partner_pe.person_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (partner_id) {
            query += " AND pma.partner_id = ?";
            params.push(partner_id);
        }

        query += " ORDER BY m.manager_id DESC";

        const [rows] = await pool.query<any[]>(query, params);
        res.json({ status: "success", results: rows.length, data: rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: List all heads
 */
export const listHeads = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [rows] = await pool.query<any[]>(
            `SELECT h.head_id, pe.name, pe.email, pe.phone, h.is_active, st.staff_id, COALESCE(st.status, CASE WHEN h.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END) as status
             FROM head h
             JOIN person pe ON h.person_id = pe.person_id
             LEFT JOIN staff st ON (pe.email = st.email OR pe.phone = st.phone)
             ORDER BY h.head_id DESC`
        );
        res.json({ status: "success", results: rows.length, data: rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: List all supervisors
 */
export const listSupervisors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [rows] = await pool.query<any[]>(
            `SELECT s.supervisor_id, pe.name, pe.email, pe.phone, s.is_active, st.staff_id, COALESCE(st.status, CASE WHEN s.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END) as status
             FROM supervisor s
             JOIN person pe ON s.person_id = pe.person_id
             LEFT JOIN staff st ON (pe.email = st.email OR pe.phone = st.phone)
             ORDER BY s.supervisor_id DESC`
        );
        res.json({ status: "success", results: rows.length, data: rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper: List all active schema assignments
 */
export const listAssignments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [headPartners] = await pool.query<any[]>(
            `SELECT hpa.assignment_id, hpa.head_id, hpe.name as head_name, hpa.partner_id, ppe.name as partner_name, hpa.start_date
             FROM head_partner_assignment hpa
             JOIN head h ON hpa.head_id = h.head_id
             JOIN person hpe ON h.person_id = hpe.person_id
             JOIN partner p ON hpa.partner_id = p.partner_id
             JOIN person ppe ON p.person_id = ppe.person_id
             WHERE hpa.is_current = TRUE`
        );

        const [partnerManagers] = await pool.query<any[]>(
            `SELECT pma.assignment_id, pma.partner_id, ppe.name as partner_name, pma.manager_id, mpe.name as manager_name, pma.start_date
             FROM partner_manager_assignment pma
             JOIN partner p ON pma.partner_id = p.partner_id
             JOIN person ppe ON p.person_id = ppe.person_id
             JOIN manager m ON pma.manager_id = m.manager_id
             JOIN person mpe ON m.person_id = mpe.person_id
             WHERE pma.is_current = TRUE`
        );

        const [partnerHostels] = await pool.query<any[]>(
            `SELECT pha.assignment_id, pha.partner_id, ppe.name as partner_name, pha.hostel_id, h.name as hostel_name, pha.start_date
             FROM partner_hostel_assignment pha
             JOIN partner p ON pha.partner_id = p.partner_id
             JOIN person ppe ON p.person_id = ppe.person_id
             JOIN hostel h ON pha.hostel_id = h.hostel_id
             WHERE pha.is_current = TRUE`
        );

        const [managerHostels] = await pool.query<any[]>(
            `SELECT mha.assignment_id, mha.manager_id, mpe.name as manager_name, mha.hostel_id, h.name as hostel_name, mha.start_date
             FROM manager_hostel_assignment mha
             JOIN manager m ON mha.manager_id = m.manager_id
             JOIN person mpe ON m.person_id = mpe.person_id
             JOIN hostel h ON mha.hostel_id = h.hostel_id
             WHERE mha.is_current = TRUE`
        );

        const [hostelSupervisors] = await pool.query<any[]>(
            `SELECT hsa.assignment_id, hsa.hostel_id, h.name as hostel_name, hsa.supervisor_id, spe.name as supervisor_name, hsa.assignment_role, hsa.start_date
             FROM hostel_supervisor_assignment hsa
             JOIN hostel h ON hsa.hostel_id = h.hostel_id
             JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
             JOIN person spe ON s.person_id = spe.person_id
             WHERE hsa.is_current = TRUE`
        );

        res.json({
            status: "success",
            data: {
                head_partner: headPartners,
                partner_manager: partnerManagers,
                partner_hostel: partnerHostels,
                manager_hostel: managerHostels,
                hostel_supervisor: hostelSupervisors
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Standalone Assignment 1: Head -> Partner
 */
export const assignHeadPartner = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { head_id, partner_id, start_date } = req.body;
        if (!head_id || !partner_id) {
            return next(new AppError("head_id and partner_id are required", 400));
        }

        const startDate = start_date || new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        await connection.query(
            "UPDATE head_partner_assignment SET is_current = FALSE, end_date = ? WHERE partner_id = ? AND is_current = TRUE",
            [startDate, partner_id]
        );

        const [result] = await connection.query<any>(
            "INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
            [head_id, partner_id, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Head assigned to Partner successfully",
            data: { assignment_id: result.insertId, head_id, partner_id, start_date: startDate }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Standalone Assignment 2: Partner -> Manager
 */
export const assignPartnerManager = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { partner_id, manager_id, start_date } = req.body;
        if (!partner_id || !manager_id) {
            return next(new AppError("partner_id and manager_id are required", 400));
        }

        const startDate = start_date || new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        await connection.query(
            "UPDATE partner_manager_assignment SET is_current = FALSE, end_date = ? WHERE manager_id = ? AND is_current = TRUE",
            [startDate, manager_id]
        );

        const [result] = await connection.query<any>(
            "INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
            [partner_id, manager_id, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Partner assigned to Manager successfully",
            data: { assignment_id: result.insertId, partner_id, manager_id, start_date: startDate }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Standalone Assignment 3: Partner -> Hostel
 */
export const assignPartnerHostel = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { partner_id, hostel_id, start_date } = req.body;
        if (!partner_id || !hostel_id) {
            return next(new AppError("partner_id and hostel_id are required", 400));
        }

        const startDate = start_date || new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        // 1. Check if Hostel currently has an active Manager assigned
        const [currentManager] = await connection.query<any[]>(
            `SELECT mha.manager_id, mpe.name as manager_name, pma.partner_id as manager_partner_id
             FROM manager_hostel_assignment mha
             JOIN manager m ON mha.manager_id = m.manager_id
             JOIN person mpe ON m.person_id = mpe.person_id
             LEFT JOIN partner_manager_assignment pma ON m.manager_id = pma.manager_id AND pma.is_current = TRUE
             WHERE mha.hostel_id = ? AND mha.is_current = TRUE`,
            [hostel_id]
        );

        if (currentManager.length > 0) {
            const mgrPartnerId = currentManager[0].manager_partner_id;
            if (mgrPartnerId !== Number(partner_id)) {
                await connection.rollback();
                return next(new AppError(
                    `Cannot reassign Hostel to Partner (ID: ${partner_id}) because it currently has Manager '${currentManager[0].manager_name}' assigned under a different Partner (ID: ${mgrPartnerId}). Please reassign or unassign the Manager first.`,
                    400
                ));
            }
        }

        // 2. Deactivate previous Partner assignment for this Hostel
        await connection.query(
            "UPDATE partner_hostel_assignment SET is_current = FALSE, end_date = ? WHERE hostel_id = ? AND is_current = TRUE",
            [startDate, hostel_id]
        );

        // 3. Insert new Partner-Hostel assignment
        const [result] = await connection.query<any>(
            "INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
            [partner_id, hostel_id, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Partner assigned to Hostel successfully",
            data: { assignment_id: result.insertId, partner_id, hostel_id, start_date: startDate }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Standalone Assignment 4: Manager -> Hostel (with Partner Scope Enforcement)
 */
export const assignManagerHostel = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { manager_id, hostel_id, start_date } = req.body;
        if (!manager_id || !hostel_id) {
            return next(new AppError("manager_id and hostel_id are required", 400));
        }

        const startDate = start_date || new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        // 1. Fetch Manager's current Partner
        const [mgrPartnerRec] = await connection.query<any[]>(
            `SELECT pma.partner_id, ppe.name as partner_name
             FROM partner_manager_assignment pma
             JOIN partner p ON pma.partner_id = p.partner_id
             JOIN person ppe ON p.person_id = ppe.person_id
             WHERE pma.manager_id = ? AND pma.is_current = TRUE`,
            [manager_id]
        );

        if (mgrPartnerRec.length === 0) {
            await connection.rollback();
            return next(new AppError("Manager is not currently assigned to any Partner", 400));
        }

        const managerPartnerId = mgrPartnerRec[0].partner_id;

        // 2. Fetch Hostel's current Partner
        const [hostelPartnerRec] = await connection.query<any[]>(
            `SELECT pha.partner_id, ppe.name as partner_name
             FROM partner_hostel_assignment pha
             JOIN partner p ON pha.partner_id = p.partner_id
             JOIN person ppe ON p.person_id = ppe.person_id
             WHERE pha.hostel_id = ? AND pha.is_current = TRUE`,
            [hostel_id]
        );

        if (hostelPartnerRec.length === 0) {
            await connection.rollback();
            return next(new AppError("Hostel is not currently assigned to any Partner", 400));
        }

        const hostelPartnerId = hostelPartnerRec[0].partner_id;

        // 3. Scope Enforcement: Manager's Partner MUST equal Hostel's Partner
        if (managerPartnerId !== hostelPartnerId) {
            await connection.rollback();
            return next(new AppError(
                `Scope mismatch: Manager belongs to Partner '${mgrPartnerRec[0].partner_name}' (ID: ${managerPartnerId}), but Hostel belongs to Partner '${hostelPartnerRec[0].partner_name}' (ID: ${hostelPartnerId}). Manager cannot be assigned to a hostel under a different Partner.`,
                400
            ));
        }

        // 4. Deactivate previous Manager assignment on this Hostel (single active manager per hostel)
        await connection.query(
            "UPDATE manager_hostel_assignment SET is_current = FALSE, end_date = ? WHERE hostel_id = ? AND is_current = TRUE",
            [startDate, hostel_id]
        );

        // 5. Insert new Manager-Hostel assignment
        const [result] = await connection.query<any>(
            "INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
            [manager_id, hostel_id, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Manager assigned to Hostel successfully",
            data: { assignment_id: result.insertId, manager_id, hostel_id, start_date: startDate }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Standalone Assignment 5: Supervisor -> Hostel + Responsibility
 */
export const assignSupervisorHostel = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { supervisor_id, hostel_id, assignment_role, start_date } = req.body;
        if (!supervisor_id || !hostel_id || !assignment_role) {
            return next(new AppError("supervisor_id, hostel_id, and assignment_role are required", 400));
        }

        if (!["TENANT_ADMIN", "MAINTENANCE"].includes(assignment_role)) {
            return next(new AppError("assignment_role must be TENANT_ADMIN or MAINTENANCE", 400));
        }

        const startDate = start_date || new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        // Deactivate previous supervisor for this specific assignment_role on this hostel
        await connection.query(
            "UPDATE hostel_supervisor_assignment SET is_current = FALSE, end_date = ? WHERE hostel_id = ? AND assignment_role = ? AND is_current = TRUE",
            [startDate, hostel_id, assignment_role]
        );

        const [result] = await connection.query<any>(
            `INSERT INTO hostel_supervisor_assignment (hostel_id, supervisor_id, assignment_role, start_date, is_current)
             VALUES (?, ?, ?, ?, TRUE)`,
            [hostel_id, supervisor_id, assignment_role, startDate]
        );

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: `Supervisor assigned to Hostel as ${assignment_role} successfully`,
            data: { assignment_id: result.insertId, supervisor_id, hostel_id, assignment_role, start_date: startDate }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

async function ensureAuditLogTableExists() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                audit_id INT AUTO_INCREMENT PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                old_values JSON NULL,
                new_values JSON NULL,
                performed_by VARCHAR(50) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (err) {
        console.error("Error ensuring audit_log table exists:", err);
    }
}

/**
 * Audit Logger Helper
 */
async function logAudit(
    entityType: string,
    entityId: string,
    action: string,
    oldValues: any,
    newValues: any,
    performedBy: string
) {
    try {
        await ensureAuditLogTableExists();
        await pool.query(
            `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [entityType, entityId, action, JSON.stringify(oldValues), JSON.stringify(newValues), performedBy || "SYSTEM"]
        );
    } catch (err) {
        console.error("Audit log insert error:", err);
    }
}

/**
 * Edit Staff Profile & Active/Inactive Status Toggle
 */
export const updateHierarchyStaff = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const staffId = Number(req.params.id);
        const { name, phone, email, status, password } = req.body;
        const editorId = (req as any).user?.staff_id || "SYSTEM";

        let [existing] = await connection.query<any[]>(
            "SELECT staff_id, name, email, phone, role, status FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (existing.length === 0) {
            const [fallback] = await connection.query<any[]>(
                `SELECT st.staff_id, st.name, st.email, st.phone, st.role, st.status
                 FROM staff st
                 JOIN person pe ON (st.email = pe.email OR (st.phone IS NOT NULL AND st.phone = pe.phone))
                 WHERE pe.person_id = ?`,
                [staffId]
            );
            if (fallback.length > 0) {
                existing = fallback;
            }
        }

        if (existing.length === 0) {
            connection.release();
            return next(new AppError("Staff record not found", 404));
        }

        const oldStaff = existing[0];
        const targetStaffId = oldStaff.staff_id;
        const currentDate = new Date().toISOString().slice(0, 10);

        await connection.beginTransaction();

        // Update Staff Base Record
        await connection.query(
            `UPDATE staff
             SET name = COALESCE(?, name),
                 email = COALESCE(?, email),
                 phone = COALESCE(?, phone),
                 status = COALESCE(?, status)
             WHERE staff_id = ?`,
            [name || null, email || null, phone || null, status || null, targetStaffId]
        );

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            await connection.query(
                "UPDATE staff SET password_hash = ? WHERE staff_id = ?",
                [passwordHash, targetStaffId]
            );
        }

        // Also update Person table if exists
        await connection.query(
            `UPDATE person
             SET name = COALESCE(?, name),
                 email = COALESCE(?, email),
                 phone = COALESCE(?, phone),
                 is_active = CASE WHEN ? = 'INACTIVE' THEN FALSE ELSE TRUE END
             WHERE email = ? OR phone = ?`,
            [name || null, email || null, phone || null, status || null, oldStaff.email, oldStaff.phone || null]
        );

        // If status changed to INACTIVE, close active assignments cleanly
        if (status && status === "INACTIVE" && oldStaff.status === "ACTIVE") {
            // Get Person ID
            const [pRec] = await connection.query<any[]>(
                "SELECT person_id FROM person WHERE email = ?",
                [oldStaff.email]
            );
            const personId = pRec[0]?.person_id;

            if (oldStaff.role === "SUPERVISOR") {
                const [sRec] = await connection.query<any[]>("SELECT supervisor_id FROM supervisor WHERE person_id = ?", [personId]);
                if (sRec.length > 0) {
                    await connection.query(
                        "UPDATE hostel_supervisor_assignment SET is_current = FALSE, end_date = ? WHERE supervisor_id = ? AND is_current = TRUE",
                        [currentDate, sRec[0].supervisor_id]
                    );
                }
            } else if (oldStaff.role === "MANAGER") {
                const [mRec] = await connection.query<any[]>("SELECT manager_id FROM manager WHERE person_id = ?", [personId]);
                if (mRec.length > 0) {
                    await connection.query(
                        "UPDATE partner_manager_assignment SET is_current = FALSE, end_date = ? WHERE manager_id = ? AND is_current = TRUE",
                        [currentDate, mRec[0].manager_id]
                    );
                    await connection.query(
                        "UPDATE manager_hostel_assignment SET is_current = FALSE, end_date = ? WHERE manager_id = ? AND is_current = TRUE",
                        [currentDate, mRec[0].manager_id]
                    );
                }
            } else if (oldStaff.role === "PARTNER") {
                const [partnerRec] = await connection.query<any[]>("SELECT partner_id FROM partner WHERE person_id = ?", [personId]);
                if (partnerRec.length > 0) {
                    await connection.query(
                        "UPDATE head_partner_assignment SET is_current = FALSE, end_date = ? WHERE partner_id = ? AND is_current = TRUE",
                        [currentDate, partnerRec[0].partner_id]
                    );
                    await connection.query(
                        "UPDATE partner_hostel_assignment SET is_current = FALSE, end_date = ? WHERE partner_id = ? AND is_current = TRUE",
                        [currentDate, partnerRec[0].partner_id]
                    );
                }
            }

            await logAudit(
                "STAFF_PROFILE",
                String(targetStaffId),
                "STATUS_TOGGLE",
                { status: "ACTIVE", role: oldStaff.role },
                { status: "INACTIVE", role: oldStaff.role },
                String(editorId)
            );
        } else if (status && status === "ACTIVE" && oldStaff.status === "INACTIVE") {
            await logAudit(
                "STAFF_PROFILE",
                String(targetStaffId),
                "STATUS_TOGGLE",
                { status: "INACTIVE", role: oldStaff.role },
                { status: "ACTIVE", role: oldStaff.role },
                String(editorId)
            );
        }

        if (name && name !== oldStaff.name) {
            await logAudit(
                "STAFF_PROFILE",
                String(targetStaffId),
                "PROFILE_UPDATE",
                { name: oldStaff.name, phone: oldStaff.phone },
                { name, phone: phone || oldStaff.phone },
                String(editorId)
            );
        }

        await connection.commit();

        res.json({
            status: "success",
            message: "Staff profile updated successfully"
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Sequential Step-by-Step Role Elevation (SUPERVISOR -> MANAGER -> PARTNER -> HEAD)
 */
export const elevateHierarchyStaffRole = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const staffId = Number(req.params.id);
        const { targetRole, partner_id, head_id, hostel_id, assignment_role } = req.body;
        const editorId = (req as any).user?.staff_id || "SYSTEM";

        const [existing] = await connection.query<any[]>(
            "SELECT staff_id, name, email, phone, role, status FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (existing.length === 0) {
            connection.release();
            return next(new AppError("Staff record not found", 404));
        }

        const staff = existing[0];
        const currentRole = staff.role;
        const currentDate = new Date().toISOString().slice(0, 10);

        // Enforce Sequential Tier Path
        const allowedPromotions: Record<string, string> = {
            SUPERVISOR: "MANAGER",
            MANAGER: "PARTNER",
            PARTNER: "HEAD"
        };

        if (!allowedPromotions[currentRole] || allowedPromotions[currentRole] !== targetRole) {
            connection.release();
            return next(new AppError(
                `Invalid promotion path. Role promotion must proceed sequentially through adjacent hierarchy tiers (Current: ${currentRole} ➔ Allowed Target: ${allowedPromotions[currentRole] || 'None'}).`,
                422
            ));
        }

        // Fetch Person ID
        const [pRec] = await connection.query<any[]>(
            "SELECT person_id FROM person WHERE email = ? OR phone = ?",
            [staff.email, staff.phone || null]
        );
        let personId = pRec[0]?.person_id;

        if (!personId) {
            const [pRes] = await connection.query<any>(
                "INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)",
                [staff.name, staff.email, staff.phone || null]
            );
            personId = pRes.insertId;
        }

        await connection.beginTransaction();

        if (currentRole === "SUPERVISOR" && targetRole === "MANAGER") {
            const targetPartnerId = partner_id ? Number(partner_id) : null;
            if (!targetPartnerId) {
                await connection.rollback();
                connection.release();
                return next(new AppError("partner_id is required when promoting a Supervisor to Manager", 400));
            }

            // 1. Deactivate previous supervisor assignment
            const [sRec] = await connection.query<any[]>("SELECT supervisor_id FROM supervisor WHERE person_id = ?", [personId]);
            if (sRec.length > 0) {
                await connection.query(
                    "UPDATE hostel_supervisor_assignment SET is_current = FALSE, end_date = ? WHERE supervisor_id = ? AND is_current = TRUE",
                    [currentDate, sRec[0].supervisor_id]
                );
            }

            // 2. Create Manager Entity
            const [mRes] = await connection.query<any>(
                "INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)",
                [personId]
            );
            const managerId = mRes.insertId;

            // 3. Assign Partner -> Manager
            await connection.query(
                "INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
                [targetPartnerId, managerId, currentDate]
            );

            // 4. Update Staff Role
            await connection.query("UPDATE staff SET role = 'MANAGER' WHERE staff_id = ?", [staffId]);

            // 5. Audit Log
            await logAudit(
                "ROLE_BINDING",
                String(staffId),
                "ELEVATE",
                { role: "SUPERVISOR" },
                { role: "MANAGER", partner_id: targetPartnerId, manager_id: managerId },
                String(editorId)
            );
        } else if (currentRole === "MANAGER" && targetRole === "PARTNER") {
            const targetHeadId = head_id ? Number(head_id) : 1;

            // 1. Deactivate previous manager assignment
            const [mRec] = await connection.query<any[]>("SELECT manager_id FROM manager WHERE person_id = ?", [personId]);
            if (mRec.length > 0) {
                await connection.query(
                    "UPDATE partner_manager_assignment SET is_current = FALSE, end_date = ? WHERE manager_id = ? AND is_current = TRUE",
                    [currentDate, mRec[0].manager_id]
                );
                await connection.query(
                    "UPDATE manager_hostel_assignment SET is_current = FALSE, end_date = ? WHERE manager_id = ? AND is_current = TRUE",
                    [currentDate, mRec[0].manager_id]
                );
            }

            // 2. Create Partner Entity
            const [pRes] = await connection.query<any>(
                "INSERT INTO partner (person_id, is_active) VALUES (?, TRUE)",
                [personId]
            );
            const partnerId = pRes.insertId;

            // 3. Assign Head -> Partner
            await connection.query(
                "INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, ?, TRUE)",
                [targetHeadId, partnerId, currentDate]
            );

            // 4. Update Staff Role
            await connection.query("UPDATE staff SET role = 'PARTNER' WHERE staff_id = ?", [staffId]);

            // 5. Audit Log
            await logAudit(
                "ROLE_BINDING",
                String(staffId),
                "ELEVATE",
                { role: "MANAGER" },
                { role: "PARTNER", partner_id: partnerId, head_id: targetHeadId },
                String(editorId)
            );
        } else if (currentRole === "PARTNER" && targetRole === "HEAD") {
            // 1. Deactivate previous partner assignment
            const [pRec] = await connection.query<any[]>("SELECT partner_id FROM partner WHERE person_id = ?", [personId]);
            if (pRec.length > 0) {
                await connection.query(
                    "UPDATE head_partner_assignment SET is_current = FALSE, end_date = ? WHERE partner_id = ? AND is_current = TRUE",
                    [currentDate, pRec[0].partner_id]
                );
                await connection.query(
                    "UPDATE partner_hostel_assignment SET is_current = FALSE, end_date = ? WHERE partner_id = ? AND is_current = TRUE",
                    [currentDate, pRec[0].partner_id]
                );
            }

            // 2. Create Head Entity
            const [hRes] = await connection.query<any>(
                "INSERT INTO head (person_id, is_active) VALUES (?, TRUE)",
                [personId]
            );

            // 3. Update Staff Role
            await connection.query("UPDATE staff SET role = 'HEAD' WHERE staff_id = ?", [staffId]);

            // 4. Audit Log
            await logAudit(
                "ROLE_BINDING",
                String(staffId),
                "ELEVATE",
                { role: "PARTNER" },
                { role: "HEAD", head_id: hRes.insertId },
                String(editorId)
            );
        }

        await connection.commit();

        res.json({
            status: "success",
            message: `Staff role successfully elevated from ${currentRole} to ${targetRole}`,
            data: { staff_id: staffId, old_role: currentRole, new_role: targetRole }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

/**
 * Dual-Source Career History Timeline (Assignment Tables + Audit Logs)
 */
export const getHierarchyStaffHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const staffId = Number(req.params.id);

        let [staffRows] = await pool.query<any[]>(
            "SELECT staff_id, name, email, phone, role, status, created_at FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (staffRows.length === 0) {
            const [fallback] = await pool.query<any[]>(
                `SELECT st.staff_id, st.name, st.email, st.phone, st.role, st.status, st.created_at
                 FROM staff st
                 JOIN person pe ON (st.email = pe.email OR (st.phone IS NOT NULL AND st.phone = pe.phone))
                 WHERE pe.person_id = ?`,
                [staffId]
            );
            if (fallback.length > 0) {
                staffRows = fallback;
            }
        }

        if (staffRows.length === 0) {
            return next(new AppError("Staff record not found", 404));
        }

        const staff = staffRows[0];
        const targetStaffId = staff.staff_id;

        // Fetch Person ID
        const [pRec] = await pool.query<any[]>(
            "SELECT person_id FROM person WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [staff.email, staff.phone || null]
        );
        const personId = pRec[0]?.person_id;

        // Collect Structural Career Assignments across all tiers
        let assignmentsList: any[] = [];
        if (personId) {
            const [hsa] = await pool.query<any[]>(
                `SELECT 'SUPERVISOR' as tier, hsa.assignment_role, h.name as scope_name, hsa.start_date, hsa.end_date, hsa.is_current
                 FROM supervisor s
                 JOIN hostel_supervisor_assignment hsa ON s.supervisor_id = hsa.supervisor_id
                 JOIN hostel h ON hsa.hostel_id = h.hostel_id
                 WHERE s.person_id = ?`,
                [personId]
            );

            const [mha] = await pool.query<any[]>(
                `SELECT 'MANAGER' as tier, 'PROPERTY_MANAGER' as assignment_role, h.name as scope_name, mha.start_date, mha.end_date, mha.is_current
                 FROM manager m
                 JOIN manager_hostel_assignment mha ON m.manager_id = mha.manager_id
                 JOIN hostel h ON mha.hostel_id = h.hostel_id
                 WHERE m.person_id = ?`,
                [personId]
            );

            const [pma] = await pool.query<any[]>(
                `SELECT 'MANAGER' as tier, 'PARTNER_BOUND' as assignment_role, pe.name as scope_name, pma.start_date, pma.end_date, pma.is_current
                 FROM manager m
                 JOIN partner_manager_assignment pma ON m.manager_id = pma.manager_id
                 JOIN partner p ON pma.partner_id = p.partner_id
                 JOIN person pe ON p.person_id = pe.person_id
                 WHERE m.person_id = ?`,
                [personId]
            );

            const [hpa] = await pool.query<any[]>(
                `SELECT 'PARTNER' as tier, 'HEAD_BOUND' as assignment_role, pe.name as scope_name, hpa.start_date, hpa.end_date, hpa.is_current
                 FROM partner p
                 JOIN head_partner_assignment hpa ON p.partner_id = hpa.partner_id
                 JOIN head h ON hpa.head_id = h.head_id
                 JOIN person pe ON h.person_id = pe.person_id
                 WHERE p.person_id = ?`,
                [personId]
            );

            assignmentsList = [...hsa, ...mha, ...pma, ...hpa];
        }

        // Collect Audit Log Events with safe table creation & query
        let auditLogs: any[] = [];
        try {
            await ensureAuditLogTableExists();
            const [rows] = await pool.query<any[]>(
                `SELECT audit_id, entity_type, action, old_values, new_values, performed_by, created_at
                 FROM audit_log
                 WHERE entity_id = ? OR entity_id = ?
                 ORDER BY audit_id DESC`,
                [String(targetStaffId), String(staffId)]
            );
            auditLogs = rows;
        } catch (auditErr) {
            console.error("Audit log fetch error:", auditErr);
            auditLogs = [];
        }

        res.json({
            status: "success",
            data: {
                staff,
                careerTimeline: assignmentsList,
                auditLogs
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Resident Stay Details Endpoint (For Resident Portal)
 */
export const getResidentStayDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        if (!currentUser) {
            return next(new AppError("User not authenticated", 401));
        }

        // Find tenant record by email or phone
        const [tenants] = await pool.query<any[]>(
            "SELECT tenant_id, name, email, phone, status FROM tenant WHERE email = ? OR (phone IS NOT NULL AND phone = ?)",
            [currentUser.email, currentUser.phone || null]
        );

        if (tenants.length === 0) {
            return res.json({
                status: "success",
                data: {
                    resident: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone },
                    stay: null,
                    maintenance_supervisor: null
                }
            });
        }

        const tenant = tenants[0];

        // Fetch active allocation
        const [allocations] = await pool.query<any[]>(
            `SELECT ta.allocation_id, ta.start_date, b.bed_id, b.bed_number, r.room_id, r.room_number, r.room_type, f.floor_id, f.floor_number, f.name as floor_name, h.hostel_id, h.name as hostel_name, h.address as hostel_address
             FROM tenant_allocation ta
             JOIN bed b ON ta.bed_id = b.bed_id
             JOIN room r ON b.room_id = r.room_id
             JOIN floor f ON r.floor_id = f.floor_id
             JOIN hostel h ON f.hostel_id = h.hostel_id
             WHERE ta.tenant_id = ? AND ta.status = 'ACTIVE'
             LIMIT 1`,
            [tenant.tenant_id]
        );

        const stay = allocations[0] || null;

        // Fetch active Maintenance Supervisor for this hostel
        let maintenanceSupervisor: any = null;
        if (stay && stay.hostel_id) {
            const [supervisors] = await pool.query<any[]>(
                `SELECT s.supervisor_id, pe.name as supervisor_name, pe.email as supervisor_email, pe.phone as supervisor_phone
                 FROM hostel_supervisor_assignment hsa
                 JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                 JOIN person pe ON s.person_id = pe.person_id
                 WHERE hsa.hostel_id = ? AND hsa.assignment_role = 'MAINTENANCE' AND hsa.is_current = TRUE
                 LIMIT 1`,
                [stay.hostel_id]
            );
            if (supervisors.length > 0) {
                maintenanceSupervisor = supervisors[0];
            }
        }

        res.json({
            status: "success",
            data: {
                resident: tenant,
                stay,
                maintenance_supervisor: maintenanceSupervisor
            }
        });
    } catch (error) {
        next(error);
    }
};
