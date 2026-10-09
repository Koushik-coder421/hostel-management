import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import bcrypt from "bcryptjs";

export const getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role, status } = req.query;
        let query = "SELECT staff_id, name, email, phone, role, status, created_at FROM staff WHERE 1=1";
        const params: any[] = [];

        if (role) {
            query += " AND role = ?";
            params.push(role);
        }

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY staff_id DESC";

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

export const getStaffById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const staffId = Number(req.params.id);

        const [rows] = await pool.query<any[]>(
            "SELECT staff_id, name, email, phone, role, status, created_at FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (rows.length === 0) {
            return next(new AppError("Staff not found", 404));
        }

        const staff = rows[0];
        let hierarchyDetails: any = null;

        if (staff.role === "PARTNER" || staff.role === "HEAD") {
            const [pRecord] = await pool.query<any[]>(
                `SELECT p.partner_id FROM partner p JOIN person pe ON p.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [staff.email, staff.phone]
            );

            const partnerId = pRecord[0]?.partner_id;

            if (partnerId) {
                const [managers] = await pool.query<any[]>(
                    `SELECT m.manager_id, pe.name, pe.email, pe.phone, pma.start_date
                     FROM partner_manager_assignment pma
                     JOIN manager m ON pma.manager_id = m.manager_id
                     JOIN person pe ON m.person_id = pe.person_id
                     WHERE pma.partner_id = ? AND pma.is_current = TRUE`,
                    [partnerId]
                );

                const [hostels] = await pool.query<any[]>(
                    `SELECT h.hostel_id, h.hostel_code, h.name, h.address, pha.start_date
                     FROM partner_hostel_assignment pha
                     JOIN hostel h ON pha.hostel_id = h.hostel_id
                     WHERE pha.partner_id = ? AND pha.is_current = TRUE`,
                    [partnerId]
                );

                const [supervisors] = await pool.query<any[]>(
                    `SELECT s.supervisor_id, pe.name, pe.email, pe.phone, hsa.assignment_role, hsa.hostel_id, h.name as hostel_name
                     FROM partner_hostel_assignment pha
                     JOIN hostel_supervisor_assignment hsa ON pha.hostel_id = hsa.hostel_id
                     JOIN hostel h ON hsa.hostel_id = h.hostel_id
                     JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                     JOIN person pe ON s.person_id = pe.person_id
                     WHERE pha.partner_id = ? AND pha.is_current = TRUE AND hsa.is_current = TRUE`,
                    [partnerId]
                );

                hierarchyDetails = {
                    partner_id: partnerId,
                    total_managers: managers.length,
                    total_hostels: hostels.length,
                    total_supervisors: supervisors.length,
                    managers,
                    hostels,
                    supervisors
                };
            }
        } else if (staff.role === "MANAGER") {
            const [mRecord] = await pool.query<any[]>(
                `SELECT m.manager_id FROM manager m JOIN person pe ON m.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
                [staff.email, staff.phone]
            );
            const managerId = mRecord[0]?.manager_id;

            if (managerId) {
                const [hostels] = await pool.query<any[]>(
                    `SELECT h.hostel_id, h.hostel_code, h.name, h.address, mha.start_date
                     FROM manager_hostel_assignment mha
                     JOIN hostel h ON mha.hostel_id = h.hostel_id
                     WHERE mha.manager_id = ? AND mha.is_current = TRUE`,
                    [managerId]
                );

                const [supervisors] = await pool.query<any[]>(
                    `SELECT s.supervisor_id, pe.name, pe.email, pe.phone, hsa.assignment_role, hsa.hostel_id, h.name as hostel_name
                     FROM manager_hostel_assignment mha
                     JOIN hostel_supervisor_assignment hsa ON mha.hostel_id = hsa.hostel_id
                     JOIN hostel h ON hsa.hostel_id = h.hostel_id
                     JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                     JOIN person pe ON s.person_id = pe.person_id
                     WHERE mha.manager_id = ? AND mha.is_current = TRUE AND hsa.is_current = TRUE`,
                    [managerId]
                );

                hierarchyDetails = {
                    manager_id: managerId,
                    total_hostels: hostels.length,
                    total_supervisors: supervisors.length,
                    hostels,
                    supervisors
                };
            }
        }

        const [assignments] = await pool.query<any[]>(
            `SELECT hs.hostel_id, h.name as hostel_name, hs.assigned_from, hs.assigned_to
             FROM hostel_staff hs
             JOIN hostel h ON hs.hostel_id = h.hostel_id
             WHERE hs.staff_id = ?
             ORDER BY hs.assigned_from DESC`,
            [staffId]
        );

        res.json({
            status: "success",
            data: {
                ...staff,
                hierarchy_details: hierarchyDetails,
                assigned_hostels: assignments
            }
        });
    } catch (error) {
        next(error);
    }
};

async function logAuditEvent(
    entityType: string,
    entityId: string,
    action: string,
    oldValues: any,
    newValues: any,
    performedBy: string
) {
    try {
        await pool.query(
            `INSERT INTO audit_log (entity_type, entity_id, action, old_values, new_values, performed_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                entityType,
                entityId,
                action,
                JSON.stringify(oldValues),
                JSON.stringify(newValues),
                performedBy || "SYSTEM"
            ]
        );
    } catch (err) {
        console.error("Failed to write audit log:", err);
    }
}

export const updateStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const staffId = Number(req.params.id);
        const { name, phone, role, responsibility, status } = req.body;
        const editorId = (req as any).user?.staff_id || "SYSTEM";

        const [existingRows] = await pool.query<any[]>(
            "SELECT staff_id, name, phone, role, status FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (existingRows.length === 0) {
            return next(new AppError("Staff not found", 404));
        }
        const existing = existingRows[0];

        // Server-Side Role + Responsibility Validation
        const targetRole = role || existing.role;
        if (targetRole === "SUPERVISOR" && responsibility && !["TENANT_ADMIN", "MAINTENANCE"].includes(responsibility)) {
            return next(new AppError("Invalid responsibility for SUPERVISOR. Must be TENANT_ADMIN or MAINTENANCE.", 422));
        }
        if (targetRole !== "SUPERVISOR" && responsibility) {
            return next(new AppError(`Role '${targetRole}' cannot have a task responsibility scope.`, 422));
        }

        // Perform Update
        await pool.query(
            `UPDATE staff
             SET name = COALESCE(?, name),
                 phone = COALESCE(?, phone),
                 role = COALESCE(?, role),
                 status = COALESCE(?, status)
             WHERE staff_id = ?`,
            [name, phone, role, status, staffId]
        );

        // Update Supervisor Assignment Role if responsibility provided
        if (targetRole === "SUPERVISOR" && responsibility) {
            await pool.query(
                `UPDATE hostel_supervisor_assignment hsa
                 JOIN supervisor s ON hsa.supervisor_id = s.supervisor_id
                 JOIN person pe ON s.person_id = pe.person_id
                 JOIN staff st ON pe.email = st.email
                 SET hsa.assignment_role = ?
                 WHERE st.staff_id = ? AND hsa.is_current = TRUE`,
                [responsibility, staffId]
            );
        }

        // Explicit Audit Event Logging
        if (name && name !== existing.name) {
            await logAuditEvent(
                "STAFF_PROFILE",
                String(staffId),
                "UPDATE",
                { name: existing.name },
                { name },
                String(editorId)
            );
        }

        if (responsibility) {
            await logAuditEvent(
                "ROLE_BINDING",
                String(staffId),
                "UPDATE",
                { role: targetRole, responsibility: "PREVIOUS" },
                { role: targetRole, responsibility },
                String(editorId)
            );
        }

        if (status && status !== existing.status) {
            await logAuditEvent(
                "STAFF_PROFILE",
                String(staffId),
                "STATUS_TOGGLE",
                { status: existing.status, role: targetRole },
                { status, role: targetRole },
                String(editorId)
            );
        }

        res.json({
            status: "success",
            message: "Staff updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const staffId = Number(req.params.id);
        const editorId = (req as any).user?.staff_id || "SYSTEM";

        const [existing] = await pool.query<any[]>(
            "SELECT staff_id, status, role FROM staff WHERE staff_id = ?",
            [staffId]
        );

        if (existing.length === 0) {
            return next(new AppError("Staff not found", 404));
        }

        await pool.query(
            "UPDATE staff SET status = 'INACTIVE' WHERE staff_id = ?",
            [staffId]
        );

        await logAuditEvent(
            "STAFF_PROFILE",
            String(staffId),
            "STATUS_TOGGLE",
            { status: existing[0].status, role: existing[0].role },
            { status: "INACTIVE", role: existing[0].role },
            String(editorId)
        );

        res.json({
            status: "success",
            message: "Staff status set to INACTIVE"
        });
    } catch (error) {
        next(error);
    }
};

export const assignStaffToHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, staff_id, assigned_from, assigned_to } = req.body;

        if (!hostel_id || !staff_id || !assigned_from) {
            return next(new AppError("hostel_id, staff_id, and assigned_from are required", 400));
        }

        if (assigned_to && new Date(assigned_to) < new Date(assigned_from)) {
            return next(new AppError("assigned_to must be on or after assigned_from date", 400));
        }

        const [hostel] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (hostel.length === 0) return next(new AppError("Hostel not found", 404));

        const [staff] = await pool.query<any[]>("SELECT staff_id FROM staff WHERE staff_id = ?", [staff_id]);
        if (staff.length === 0) return next(new AppError("Staff not found", 404));

        await pool.query(
            `INSERT INTO hostel_staff (hostel_id, staff_id, assigned_from, assigned_to)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE assigned_to = VALUES(assigned_to)`,
            [hostel_id, staff_id, assigned_from, assigned_to || null]
        );

        res.status(201).json({
            status: "success",
            message: "Staff assigned to hostel successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const provisionOrganizationHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const {
            head_name,
            total_hostels,
            partners_count,
            managers_per_partner
        } = req.body;

        if (!total_hostels || !partners_count || !managers_per_partner) {
            return next(new AppError("total_hostels, partners_count, and managers_per_partner are required in the request body", 400));
        }

        const targetTotalHostels = Number(total_hostels);
        const totalPartners = Number(partners_count);
        const managersPerPartner = Number(managers_per_partner);
        const headName = head_name || "Organization Head";
        const totalManagers = totalPartners * managersPerPartner;

        if (targetTotalHostels <= 0 || totalPartners <= 0 || managersPerPartner <= 0) {
            return next(new AppError("total_hostels, partners_count, and managers_per_partner must be positive numbers", 400));
        }

        const baseHostelsPerManager = Math.floor(targetTotalHostels / totalManagers);
        let extraHostels = targetTotalHostels % totalManagers;

        const defaultPasswordHash = await bcrypt.hash("pass123", 10);

        // 1. Create Head Person, Head Entity & Staff Login
        const headEmail = `head_${Date.now()}@hostel.com`;
        const headPhone = `90000${Math.floor(10000 + Math.random() * 90000)}`;

        const [headPersonResult] = await connection.query<any>(
            `INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)`,
            [headName, headEmail, headPhone]
        );
        const headPersonId = headPersonResult.insertId;

        const [headResult] = await connection.query<any>(
            `INSERT INTO head (person_id, is_active) VALUES (?, TRUE)`,
            [headPersonId]
        );
        const headId = headResult.insertId;

        await connection.query(
            `INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'HEAD', 'ACTIVE')`,
            [headName, headEmail, defaultPasswordHash, headPhone]
        );

        let createdHostelCount = 0;
        let createdPartnerCount = 0;
        let createdManagerCount = 0;
        let createdSupervisorCount = 0;

        const startDate = new Date().toISOString().slice(0, 10);

        // 2. Loop Partners
        for (let p = 1; p <= totalPartners; p++) {
            const pPhone = `91${(Date.now() + p) % 10000000}`;
            const pEmail = `partner_${p}_${Date.now()}_${p}@hostel.com`;
            const pName = `Partner ${p}`;

            const [pPerson] = await connection.query<any>(
                `INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)`,
                [pName, pEmail, pPhone]
            );
            const [partnerRes] = await connection.query<any>(
                `INSERT INTO partner (person_id, is_active) VALUES (?, TRUE)`,
                [pPerson.insertId]
            );
            const partnerId = partnerRes.insertId;
            createdPartnerCount++;

            await connection.query(
                `INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'PARTNER', 'ACTIVE')`,
                [pName, pEmail, defaultPasswordHash, pPhone]
            );

            // Head - Partner Assignment
            await connection.query(
                `INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, ?, TRUE)`,
                [headId, partnerId, startDate]
            );

            // 3. Loop Managers per Partner
            for (let m = 1; m <= managersPerPartner; m++) {
                const managerIndex = (p - 1) * managersPerPartner + m;
                const mPhone = `92${(Date.now() + managerIndex) % 10000000}`;
                const mEmail = `manager_${managerIndex}_${Date.now()}_${m}@hostel.com`;
                const mName = `Manager P${p}-M${m}`;

                const [mPerson] = await connection.query<any>(
                    `INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)`,
                    [mName, mEmail, mPhone]
                );
                const [managerRes] = await connection.query<any>(
                    `INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)`,
                    [mPerson.insertId]
                );
                const managerId = managerRes.insertId;
                createdManagerCount++;

                await connection.query(
                    `INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'MANAGER', 'ACTIVE')`,
                    [mName, mEmail, defaultPasswordHash, mPhone]
                );

                // Partner - Manager Assignment
                await connection.query(
                    `INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, ?, TRUE)`,
                    [partnerId, managerId, startDate]
                );

                // Calculate hostels for this manager
                let hostelsForThisManager = baseHostelsPerManager;
                if (extraHostels > 0) {
                    hostelsForThisManager++;
                    extraHostels--;
                }

                // 4. Loop Hostels per Manager
                for (let h = 1; h <= hostelsForThisManager; h++) {
                    createdHostelCount++;
                    const hostelCode = `HSTL-P${p}-M${m}-H${h}-${Math.floor(1000 + Math.random() * 9000)}`;
                    const hostelName = `Hostel ${createdHostelCount} (P${p}-M${m})`;

                    const [hostelRes] = await connection.query<any>(
                        `INSERT INTO hostel (hostel_code, name, address, contact_number, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
                        [hostelCode, hostelName, `Address Block ${p}-${m}-${h}`, `040-99${createdHostelCount}`]
                    );
                    const hostelId = hostelRes.insertId;

                    // Partner - Hostel Assignment
                    await connection.query(
                        `INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, ?, TRUE)`,
                        [partnerId, hostelId, startDate]
                    );

                    // Manager - Hostel Assignment
                    await connection.query(
                        `INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, ?, TRUE)`,
                        [managerId, hostelId, startDate]
                    );

                    // 5. Create 2 Supervisors per Hostel (1 Tenant Admin, 1 Maintenance)
                    const roles: ("TENANT_ADMIN" | "MAINTENANCE")[] = ["TENANT_ADMIN", "MAINTENANCE"];
                    for (const roleType of roles) {
                        const uniquePhone = `93${(Date.now() + createdSupervisorCount) % 10000000}`;
                        const sEmail = `sup_${roleType.toLowerCase()}_${createdHostelCount}_${Date.now()}_${createdSupervisorCount}@hostel.com`;
                        const sName = `Supervisor ${roleType} H${createdHostelCount}`;

                        const [sPerson] = await connection.query<any>(
                            `INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)`,
                            [sName, sEmail, uniquePhone]
                        );
                        const [supervisorRes] = await connection.query<any>(
                            `INSERT INTO supervisor (person_id, is_active) VALUES (?, TRUE)`,
                            [sPerson.insertId]
                        );
                        const supervisorId = supervisorRes.insertId;
                        createdSupervisorCount++;

                        await connection.query(
                            `INSERT INTO staff (name, email, password_hash, phone, role, status) VALUES (?, ?, ?, ?, 'SUPERVISOR', 'ACTIVE')`,
                            [sName, sEmail, defaultPasswordHash, uniquePhone]
                        );

                        // Hostel - Supervisor Assignment
                        await connection.query(
                            `INSERT INTO hostel_supervisor_assignment (hostel_id, supervisor_id, assignment_role, start_date, is_current) VALUES (?, ?, ?, ?, TRUE)`,
                            [hostelId, supervisorId, roleType, startDate]
                        );
                    }
                }
            }
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Organization hierarchy provisioned successfully",
            data: {
                head_id: headId,
                total_partners: createdPartnerCount,
                total_managers: createdManagerCount,
                total_hostels: createdHostelCount,
                total_supervisors: createdSupervisorCount,
                hostels_per_partner: createdHostelCount / createdPartnerCount,
                hostels_per_manager: createdHostelCount / createdManagerCount,
                supervisors_per_hostel: createdSupervisorCount / createdHostelCount
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
