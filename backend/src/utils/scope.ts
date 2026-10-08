import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";

export interface UserScope {
    userId: string;
    role: string;
    responsibility: string | null;
    organizationId: string;
    allowedHostelIds: string[];
    activeHostelId: string;
}

export const activeHostelStore = new Map<number, string>();

export async function buildUserScope(staff: { staff_id: number; email: string; phone?: string; role: string }): Promise<UserScope> {
    const role = staff.role;
    let allowedHostelIds: string[] = [];
    let assignmentRole: string | undefined = undefined;

    if (role === "SUPERADMIN" || role === "ADMIN") {
        const [hostelRows] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE status = 'ACTIVE'");
        allowedHostelIds = hostelRows.map((h) => String(h.hostel_id));
    } else if (role === "HEAD") {
        const [hRec] = await pool.query<any[]>(
            `SELECT h.head_id FROM head h JOIN person pe ON h.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
            [staff.email, staff.phone || null]
        );
        if (hRec.length > 0) {
            const headId = hRec[0].head_id;
            const [hostelRows] = await pool.query<any[]>(
                `SELECT pha.hostel_id FROM head_partner_assignment hpa
                 JOIN partner_hostel_assignment pha ON hpa.partner_id = pha.partner_id
                 WHERE hpa.head_id = ? AND hpa.is_current = TRUE AND pha.is_current = TRUE`,
                [headId]
            );
            allowedHostelIds = hostelRows.map((h) => String(h.hostel_id));
        }
    } else if (role === "PARTNER") {
        const [pRec] = await pool.query<any[]>(
            `SELECT p.partner_id FROM partner p JOIN person pe ON p.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
            [staff.email, staff.phone || null]
        );
        if (pRec.length > 0) {
            const partnerId = pRec[0].partner_id;
            const [hostelRows] = await pool.query<any[]>(
                `SELECT hostel_id FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE`,
                [partnerId]
            );
            allowedHostelIds = hostelRows.map((h) => String(h.hostel_id));
        }
    } else if (role === "MANAGER") {
        const [mRec] = await pool.query<any[]>(
            `SELECT m.manager_id FROM manager m JOIN person pe ON m.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
            [staff.email, staff.phone || null]
        );
        if (mRec.length > 0) {
            const managerId = mRec[0].manager_id;
            const [hostelRows] = await pool.query<any[]>(
                `SELECT hostel_id FROM manager_hostel_assignment WHERE manager_id = ? AND is_current = TRUE`,
                [managerId]
            );
            allowedHostelIds = hostelRows.map((h) => String(h.hostel_id));
        }
    } else if (role === "SUPERVISOR") {
        const [sRec] = await pool.query<any[]>(
            `SELECT s.supervisor_id FROM supervisor s JOIN person pe ON s.person_id = pe.person_id WHERE pe.email = ? OR pe.phone = ?`,
            [staff.email, staff.phone || null]
        );
        if (sRec.length > 0) {
            const supervisorId = sRec[0].supervisor_id;
            const [hsaRows] = await pool.query<any[]>(
                `SELECT hostel_id, assignment_role FROM hostel_supervisor_assignment WHERE supervisor_id = ? AND is_current = TRUE`,
                [supervisorId]
            );
            allowedHostelIds = hsaRows.map((h) => String(h.hostel_id));
            if (hsaRows.length > 0) {
                assignmentRole = hsaRows[0].assignment_role;
            }
        }
    } else if (role === "TENANT" || role === "tenant" || role === "resident" || role === "RESIDENT") {
        const [tRec] = await pool.query<any[]>(
            `SELECT f.hostel_id FROM tenant t
             JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
             JOIN bed b ON ta.bed_id = b.bed_id
             JOIN room r ON b.room_id = r.room_id
             JOIN floor f ON r.floor_id = f.floor_id
             WHERE t.email = ? OR t.phone = ?`,
            [staff.email, staff.phone || null]
        );
        allowedHostelIds = tRec.map((h) => String(h.hostel_id));
    }

    let activeHostelId = allowedHostelIds.length > 0 ? allowedHostelIds[0] : "";
    const stored = activeHostelStore.get(staff.staff_id);
    if (stored && (role === "SUPERADMIN" || role === "ADMIN" || allowedHostelIds.includes(stored))) {
        activeHostelId = stored;
    }

    return {
        userId: String(staff.staff_id),
        role: staff.role,
        responsibility: assignmentRole || null,
        organizationId: "1",
        allowedHostelIds,
        activeHostelId
    };
}

/**
 * Validates whether the given staff member or UserScope has access to the specified hostel ID.
 * Throws 403 Forbidden if the hostel is out of scope.
 */
export async function enforceHostelScope(
    staffOrScope: { staff_id: number; email: string; phone?: string; role: string } | UserScope,
    hostelId: number | string
): Promise<UserScope> {
    const scope = "allowedHostelIds" in staffOrScope
        ? staffOrScope
        : await buildUserScope(staffOrScope);

    if (scope.role === "SUPERADMIN" || scope.role === "ADMIN") {
        return scope;
    }

    const targetIdStr = String(hostelId);
    if (!scope.allowedHostelIds.includes(targetIdStr)) {
        throw new AppError(`Forbidden: Access denied to Hostel ID ${hostelId}. Out of allowed scope.`, 403);
    }

    return scope;
}

/**
 * Validates that if staff is a SUPERVISOR, they are NOT a TENANT_ADMIN supervisor trying to perform MAINTENANCE actions.
 */
export function enforceTenantAdminResponsibility(scope: UserScope) {
    if (scope.role === "SUPERVISOR" && scope.responsibility === "MAINTENANCE") {
        throw new AppError("Forbidden: Maintenance supervisors do not have tenant admin permissions.", 403);
    }
}

/**
 * Validates that if staff is a SUPERVISOR, they are NOT a TENANT_ADMIN supervisor trying to perform MAINTENANCE operations.
 */
export function enforceMaintenanceSupervisorResponsibility(scope: UserScope) {
    if (scope.role === "SUPERVISOR" && scope.responsibility === "TENANT_ADMIN") {
        throw new AppError("Forbidden: Tenant admin supervisors do not have maintenance operation permissions.", 403);
    }
}

/**
 * Resolves hostel_id from room_id
 */
export async function getHostelIdFromRoom(roomId: number): Promise<number> {
    const [rows] = await pool.query<any[]>(
        `SELECT f.hostel_id FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE r.room_id = ?`,
        [roomId]
    );
    if (rows.length === 0) throw new AppError("Room not found", 404);
    return rows[0].hostel_id;
}

/**
 * Resolves hostel_id from bed_id
 */
export async function getHostelIdFromBed(bedId: number): Promise<number> {
    const [rows] = await pool.query<any[]>(
        `SELECT f.hostel_id FROM bed b JOIN room r ON b.room_id = r.room_id JOIN floor f ON r.floor_id = f.floor_id WHERE b.bed_id = ?`,
        [bedId]
    );
    if (rows.length === 0) throw new AppError("Bed not found", 404);
    return rows[0].hostel_id;
}
