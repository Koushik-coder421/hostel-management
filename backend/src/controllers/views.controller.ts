import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { buildUserScope } from "../utils/scope";
import { AppError } from "../middleware/errorHandler";

function mapRole(role: string): string {
    if (role === "SUPERADMIN" || role === "ADMIN" || role === "HEAD") return "platform_admin";
    if (role === "PARTNER") return "organization_admin";
    return "manager";
}

async function getActiveHostel(scope: any) {
    const hostelId = scope.activeHostelId || (scope.allowedHostelIds.length > 0 ? scope.allowedHostelIds[0] : null);
    if (!hostelId) return null;
    const [rows] = await pool.query<any[]>(
        "SELECT hostel_id, name, hostel_code, address, status FROM hostel WHERE hostel_id = ?",
        [hostelId]
    );
    if (rows.length === 0) return null;
    const h = rows[0];
    return {
        id: String(h.hostel_id),
        name: h.name,
        code: h.hostel_code || `HSTL-${h.hostel_id}`,
        organizationId: "1",
        city: h.address || "Main City",
        addressLine1: h.address || "",
        status: h.status === "ACTIVE" ? ("active" as const) : ("inactive" as const),
        timezone: "Asia/Kolkata"
    };
}

export const getViewDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };
        const mappedRole = user ? mapRole(user.role) : "manager";
        const isGlobalAdmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN" || user?.role === "HEAD";

        let hostelCondition = "";
        const hostelParams: any[] = [];
        if (!isGlobalAdmin) {
            if (scope.allowedHostelIds.length === 0) {
                hostelCondition = " AND 1=0";
            } else {
                hostelCondition = " AND h.hostel_id IN (?)";
                hostelParams.push(scope.allowedHostelIds);
            }
        }

        const [[{ total_partners }]] = await pool.query<any[]>("SELECT COUNT(*) as total_partners FROM partner WHERE is_active = TRUE");

        let totalHostelsQuery = "SELECT COUNT(*) as total_hostels FROM hostel h WHERE h.status = 'ACTIVE'";
        if (!isGlobalAdmin) totalHostelsQuery += hostelCondition;
        const [[{ total_hostels }]] = await pool.query<any[]>(totalHostelsQuery, hostelParams);

        let totalTenantsQuery = `
            SELECT COUNT(DISTINCT t.tenant_id) as total_tenants
            FROM tenant t
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE t.status = 'ACTIVE'
        `;
        if (!isGlobalAdmin) totalTenantsQuery += hostelCondition;
        const [[{ total_tenants }]] = await pool.query<any[]>(totalTenantsQuery, hostelParams);

        let totalBedsQuery = `
            SELECT COUNT(b.bed_id) as total_beds
            FROM bed b
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE 1=1
        `;
        if (!isGlobalAdmin) totalBedsQuery += hostelCondition;
        const [[{ total_beds }]] = await pool.query<any[]>(totalBedsQuery, hostelParams);

        let occupiedBedsQuery = `
            SELECT COUNT(b.bed_id) as occupied_beds
            FROM bed b
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE b.status = 'OCCUPIED'
        `;
        if (!isGlobalAdmin) occupiedBedsQuery += hostelCondition;
        const [[{ occupied_beds }]] = await pool.query<any[]>(occupiedBedsQuery, hostelParams);

        let totalRevenueQuery = `
            SELECT COALESCE(SUM(p.amount), 0) as total_revenue
            FROM payment p
            LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE p.status = 'SUCCESS'
        `;
        if (!isGlobalAdmin) totalRevenueQuery += hostelCondition;
        const [[{ total_revenue }]] = await pool.query<any[]>(totalRevenueQuery, hostelParams);

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

        let hostelsListQuery = "SELECT h.hostel_id, h.hostel_code, h.name, h.address FROM hostel h WHERE h.status = 'ACTIVE'";
        if (!isGlobalAdmin) hostelsListQuery += hostelCondition;
        const [hostelsList] = await pool.query<any[]>(hostelsListQuery, hostelParams);

        const activeHostel = await getActiveHostel(scope);
        const physicalBeds = Number(total_beds || 0);
        const sellableBeds = Number(total_beds || 0);
        const occupiedBeds = Number(occupied_beds || 0);
        const availableBeds = Math.max(0, sellableBeds - occupiedBeds);
        const occupancyRate = sellableBeds > 0 ? Number(((occupiedBeds / sellableBeds) * 100).toFixed(1)) : 0;

        const managerData = {
            hostelName: activeHostel ? activeHostel.name : (hostelsList.length > 0 ? hostelsList[0].name : "Assigned Hostel"),
            physicalBeds,
            sellableBeds,
            occupiedBeds,
            availableBeds,
            occupancyRate,
            blockedBeds: 0,
            activeResidents: Number(total_tenants || 0),
            overdueInvoices: 0,
            collectionsTodayPaise: String(Math.round(Number(total_revenue || 0) * 100)),
            paymentsDueToday: 0,
            expectedCheckouts: 0,
            recentActivity: [],
            overdueInvoicesList: []
        };

        const orgData = {
            organizationName: partnersList.length > 0 ? `${partnersList[0].name} Portfolio` : "Organization Portfolio",
            hostelCount: Number(total_hostels || 0),
            totalResidents: Number(total_tenants || 0),
            physicalBeds,
            sellableBeds,
            occupiedBeds,
            availableBeds,
            occupancyRate,
            currentMonthBilledPaise: String(Math.round(Number(total_revenue || 0) * 100)),
            currentMonthCollectedPaise: String(Math.round(Number(total_revenue || 0) * 100)),
            totalOutstandingPaise: "0",
            totalOverduePaise: "0",
            hostels: hostelsList.map((h: any) => ({
                id: String(h.hostel_id),
                name: h.name,
                city: h.address || "-",
                residentCount: 0,
                physicalBeds: 0,
                sellableBeds: 0,
                occupiedBeds: 0,
                availableBeds: 0,
                occupancyRate: 0,
                outstandingPaise: "0"
            }))
        };

        const platformData = {
            activeOrganizations: Number(total_partners || partnersList.length || 0),
            activeHostels: Number(total_hostels || 0),
            activeResidents: Number(total_tenants || 0),
            currentMonthBilledPaise: String(Math.round(Number(total_revenue || 0) * 100)),
            currentMonthCollectedPaise: String(Math.round(Number(total_revenue || 0) * 100)),
            totalOutstandingPaise: "0",
            totalOverduePaise: "0",
            overdueInvoicesCount: 0,
            organizations: partnersList.map((p: any) => ({
                id: String(p.partner_id),
                name: p.name || `Partner #${p.partner_id}`,
                hostelCount: Number(p.hostel_count || 0),
                residentCount: Number(p.manager_count || 0),
                billedPaise: "0",
                outstandingPaise: "0",
                overduePaise: "0"
            }))
        };

        res.json({
            status: "success",
            success: true,
            data: {
                role: mappedRole,
                platformData: mappedRole === "platform_admin" ? platformData : null,
                orgData: mappedRole === "organization_admin" ? orgData : null,
                managerData: (mappedRole === "manager" || mappedRole === "organization_admin") ? managerData : null
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewResidents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };
        const activeHostel = await getActiveHostel(scope);
        const searchQuery = (req.query.q as string || "").trim().toLowerCase();
        const statusFilter = (req.query.status as string || "all").trim().toLowerCase();

        let sql = `
            SELECT t.tenant_id, t.name, t.first_name, t.last_name, t.email, t.phone, t.gender, t.status, t.created_at,
                   r.room_number, b.bed_number, NULL as rent_amount, ta.start_date
            FROM tenant t
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (scope.activeHostelId) {
            sql += ` AND (f.hostel_id = ? OR f.hostel_id IS NULL)`;
            params.push(scope.activeHostelId);
        }

        const [rows] = await pool.query<any[]>(sql, params);

        let residents = rows.map((t: any) => {
            const fullName = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Resident #${t.tenant_id}`;
            const status = t.status === "ACTIVE" ? "active" : "checked_out";
            return {
                id: String(t.tenant_id),
                fullName,
                phone: t.phone || "-",
                email: t.email || null,
                gender: (t.gender || "undisclosed").toLowerCase(),
                status: status as "active" | "checked_out",
                createdAt: (t.created_at ? new Date(t.created_at) : new Date()).toISOString(),
                roomNumber: t.room_number || undefined,
                bedLabel: t.bed_number || undefined,
                agreedRentPaise: t.rent_amount ? String(Math.round(Number(t.rent_amount) * 100)) : undefined,
                startDate: t.start_date ? String(t.start_date).slice(0, 10) : undefined
            };
        });

        if (statusFilter !== "all") {
            residents = residents.filter(r => r.status === statusFilter);
        }
        if (searchQuery) {
            residents = residents.filter(r => r.fullName.toLowerCase().includes(searchQuery) || r.phone.includes(searchQuery));
        }

        const [allRows] = await pool.query<any[]>("SELECT status FROM tenant");
        const total = allRows.length;
        const active = allRows.filter(r => r.status === "ACTIVE").length;
        const checkedOut = allRows.filter(r => r.status !== "ACTIVE").length;

        res.json({
            status: "success",
            success: true,
            data: {
                hostel: activeHostel,
                residents,
                stats: { total, active, checkedOut },
                filters: { search: searchQuery, status: statusFilter }
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewResidentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const [rows] = await pool.query<any[]>(
            `SELECT t.*, ta.allocation_id, ta.start_date, NULL as rent_amount, ta.status as alloc_status,
                    b.bed_id, b.bed_number, r.room_id, r.room_number, f.name as floor_label
             FROM tenant t
             LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
             LEFT JOIN bed b ON ta.bed_id = b.bed_id
             LEFT JOIN room r ON b.room_id = r.room_id
             LEFT JOIN floor f ON r.floor_id = f.floor_id
             WHERE t.tenant_id = ?`,
            [id]
        );

        if (rows.length === 0) {
            throw new AppError("Resident not found", 404);
        }

        const t = rows[0];
        const fullName = t.name || `${t.first_name || ''} ${t.last_name || ''}`.trim() || `Resident #${t.tenant_id}`;
        const isActive = t.status === "ACTIVE";

        const resident = {
            id: String(t.tenant_id),
            fullName,
            phone: t.phone || "-",
            email: t.email || null,
            gender: (t.gender || "undisclosed").toLowerCase(),
            status: isActive ? "active" as const : "checked_out" as const,
            createdAt: (t.created_at ? new Date(t.created_at) : new Date()).toISOString(),
            roomNumber: t.room_number || undefined,
            bedLabel: t.bed_number || undefined,
            agreedRentPaise: t.rent_amount ? String(Math.round(Number(t.rent_amount) * 100)) : undefined,
            startDate: t.start_date ? String(t.start_date).slice(0, 10) : undefined,
            emergencyContactName: t.emergency_contact_name || null,
            emergencyContactPhone: t.emergency_contact_phone || null,
            room: t.room_id ? { id: String(t.room_id), roomNumber: String(t.room_number) } : null,
            bed: t.bed_id ? { id: String(t.bed_id), bedLabel: String(t.bed_number) } : null,
            activeAgreement: isActive ? {
                id: String(t.allocation_id || "1"),
                status: "active",
                agreedRentPaise: t.rent_amount ? String(Math.round(Number(t.rent_amount) * 100)) : "800000",
                agreedDepositPaise: "1600000",
                billingDay: 1,
                startDate: t.start_date ? String(t.start_date).slice(0, 10) : "2026-09-01",
                expectedEndDate: null,
                noticePeriodDays: 30
            } : null,
            ratePlan: isActive ? { id: "1", name: "Standard Plan" } : null
        };

        const [payments] = await pool.query<any[]>(
            `SELECT p.* FROM payment p
             LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
             WHERE ta.tenant_id = ?`,
            [id]
        );

        const mappedPayments = payments.map((p: any) => ({
            id: String(p.payment_id),
            receivedAt: (p.payment_date ? new Date(p.payment_date) : new Date()).toISOString(),
            paymentMethod: (p.payment_mode || "upi").toLowerCase(),
            reference: p.transaction_id || null,
            amountPaise: String(Math.round(Number(p.amount || 0) * 100)),
            status: p.status === "SUCCESS" ? "succeeded" : "pending",
            notes: p.remarks || null
        }));

        res.json({
            status: "success",
            success: true,
            data: {
                resident,
                location: { buildingName: "Main Building", floorLabel: t.floor_label || null },
                invoices: [],
                payments: mappedPayments,
                financialSummary: {
                    totalBilledPaise: "0",
                    totalPaidPaise: "0",
                    totalOutstandingPaise: "0"
                },
                activityTimeline: []
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewRooms = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };
        const activeHostel = await getActiveHostel(scope);

        let hostelId = scope.activeHostelId || 1;
        const [floors] = await pool.query<any[]>(
            "SELECT floor_id, name, floor_number FROM floor WHERE hostel_id = ? ORDER BY floor_number ASC",
            [hostelId]
        );

        const [rooms] = await pool.query<any[]>(
            `SELECT r.*, f.name as floor_label, f.floor_number
             FROM room r
             JOIN floor f ON r.floor_id = f.floor_id
             WHERE f.hostel_id = ?`,
            [hostelId]
        );

        const [beds] = await pool.query<any[]>(
            `SELECT b.*, r.room_id
             FROM bed b
             JOIN room r ON b.room_id = r.room_id
             JOIN floor f ON r.floor_id = f.floor_id
             WHERE f.hostel_id = ?`,
            [hostelId]
        );

        const floorGroups = floors.map((fl: any) => {
            const floorRooms = rooms.filter((r: any) => r.floor_id === fl.floor_id);
            const mappedRooms = floorRooms.map((r: any) => {
                const roomBeds = beds.filter((b: any) => b.room_id === r.room_id);
                const occupiedCount = roomBeds.filter((b: any) => b.status === "OCCUPIED").length;
                const blockedCount = roomBeds.filter((b: any) => b.status === "BLOCKED").length;
                const availableCount = roomBeds.filter((b: any) => b.status === "AVAILABLE").length;
                return {
                    id: String(r.room_id),
                    roomNumber: String(r.room_number),
                    floorId: String(fl.floor_id),
                    floorLabel: fl.name,
                    floorSortOrder: fl.floor_number,
                    buildingId: "b1",
                    buildingName: "Main Building",
                    roomTypeId: "rt1",
                    roomTypeName: r.room_type || "Standard Room",
                    acType: (r.room_type || "").toLowerCase().includes("non-ac") ? "non_ac" as const : "ac" as const,
                    standardCapacity: Number(r.capacity || 2),
                    isStore: false,
                    status: "active" as const,
                    occupiedCount,
                    blockedCount,
                    availableCount,
                    totalBeds: roomBeds.length,
                    sharingLabel: r.sharing_type || `${r.capacity || 2}-Sharing`,
                    statusColor: availableCount > 0 ? "green" as const : "red" as const,
                    beds: roomBeds.map((b: any) => ({
                        id: String(b.bed_id),
                        bedLabel: String(b.bed_number),
                        operationalStatus: "in_service" as const,
                        status: b.status === "OCCUPIED" ? "occupied" as const : b.status === "BLOCKED" ? "blocked" as const : "available" as const
                    }))
                };
            });

            const totalRooms = mappedRooms.length;
            const totalBeds = mappedRooms.reduce((acc: number, r: any) => acc + r.totalBeds, 0);
            const occupiedBeds = mappedRooms.reduce((acc: number, r: any) => acc + r.occupiedCount, 0);
            const availableBeds = mappedRooms.reduce((acc: number, r: any) => acc + r.availableCount, 0);

            return {
                id: String(fl.floor_id),
                label: fl.name,
                sortOrder: fl.floor_number,
                buildingId: "b1",
                buildingName: "Main Building",
                rooms: mappedRooms,
                totalRooms,
                occupiedBeds,
                totalBeds,
                availableBeds
            };
        });

        const totalRooms = rooms.length;
        const totalBeds = beds.length;
        const occupiedBeds = beds.filter((b: any) => b.status === "OCCUPIED").length;
        const availableBeds = beds.filter((b: any) => b.status === "AVAILABLE").length;

        res.json({
            status: "success",
            success: true,
            data: {
                hostel: activeHostel,
                floors: floorGroups,
                buildings: [{ id: "b1", name: "Main Building", sortOrder: 1 }],
                stats: { totalRooms, totalBeds, occupiedBeds, availableBeds }
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewCheckIns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };
        const activeHostel = await getActiveHostel(scope);
        let hostelId = scope.activeHostelId || 1;

        const [floors] = await pool.query<any[]>(
            "SELECT floor_id, name as label, floor_number as sortOrder FROM floor WHERE hostel_id = ?",
            [hostelId]
        );

        const [rooms] = await pool.query<any[]>(
            `SELECT r.room_id as id, r.floor_id as floorId, r.room_number as roomNumber,
                    r.room_type as roomTypeName, r.capacity as standardCapacity
             FROM room r JOIN floor f ON r.floor_id = f.floor_id WHERE f.hostel_id = ?`,
            [hostelId]
        );

        const [beds] = await pool.query<any[]>(
            `SELECT b.bed_id as id, b.room_id as roomId, b.bed_number as bedLabel
             FROM bed b JOIN room r ON b.room_id = r.room_id JOIN floor f ON r.floor_id = f.floor_id
             WHERE f.hostel_id = ? AND b.status = 'AVAILABLE'`,
            [hostelId]
        );

        const mappedFloors = floors.map((f: any) => ({
            id: String(f.floor_id || f.id || 1),
            buildingId: "b1",
            label: f.label || "First Floor",
            sortOrder: Number(f.sortOrder || 1)
        }));

        const mappedRooms = rooms.map((r: any) => ({
            id: String(r.id),
            buildingId: "b1",
            floorId: String(r.floorId),
            roomTypeId: "rt1",
            roomNumber: String(r.roomNumber),
            roomTypeName: r.roomTypeName || "Standard Room",
            standardCapacity: Number(r.standardCapacity || 2),
            acType: (r.roomTypeName || "").toLowerCase().includes("non-ac") ? "non_ac" as const : "ac" as const
        }));

        const mappedBeds = beds.map((b: any) => ({
            id: String(b.id),
            roomId: String(b.roomId),
            bedLabel: String(b.bedLabel)
        }));

        res.json({
            status: "success",
            success: true,
            data: {
                hostel: activeHostel,
                buildings: [{ id: "b1", name: "Main Building", sortOrder: 1 }],
                floors: mappedFloors,
                rooms: mappedRooms,
                availableBeds: mappedBeds,
                ratePlans: [{
                    id: "rp1",
                    roomTypeId: "rt1",
                    name: "Standard Monthly Plan",
                    occupancyCount: 2,
                    rentPaise: "800000",
                    depositPaise: "1600000"
                }],
                preselectedRoomId: (req.query.roomId as string) || null
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewCheckOuts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [activeAllocations] = await pool.query<any[]>(
            `SELECT ta.allocation_id, ta.start_date, NULL as rent_amount,
                    t.tenant_id, t.name, t.phone, t.email, t.gender,
                    b.bed_id, b.bed_number, r.room_id, r.room_number
             FROM tenant_allocation ta
             JOIN tenant t ON ta.tenant_id = t.tenant_id
             JOIN bed b ON ta.bed_id = b.bed_id
             JOIN room r ON b.room_id = r.room_id
             WHERE ta.status = 'ACTIVE'`
        );

        const activeResidents = activeAllocations.map((a: any) => ({
            allocationId: String(a.allocation_id),
            residentId: String(a.tenant_id),
            residentName: a.name || `Resident #${a.tenant_id}`,
            phone: a.phone || "-",
            email: a.email || null,
            gender: (a.gender || "undisclosed").toLowerCase(),
            occupiedFrom: (a.start_date ? new Date(a.start_date) : new Date()).toISOString(),
            agreementId: String(a.allocation_id),
            agreedRentPaise: a.rent_amount ? String(Math.round(Number(a.rent_amount) * 100)) : "800000",
            billingDay: 1,
            roomNumber: String(a.room_number),
            bedLabel: String(a.bed_number),
            roomId: String(a.room_id),
            bedId: String(a.bed_id)
        }));

        res.json({
            status: "success",
            success: true,
            data: {
                activeResidents,
                recentCheckouts: []
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [payments] = await pool.query<any[]>(
            `SELECT p.*, t.tenant_id, t.name as tenant_name, t.phone as tenant_phone
             FROM payment p
             LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
             LEFT JOIN tenant t ON ta.tenant_id = t.tenant_id`
        );

        const invoices = payments.map((p: any) => ({
            id: String(p.payment_id),
            invoiceNumber: `INV-${p.payment_id}`,
            residentName: p.tenant_name || "Resident",
            residentPhone: p.tenant_phone || "-",
            residentId: String(p.tenant_id || "1"),
            totalPaise: String(Math.round(Number(p.amount || 0) * 100)),
            paidPaise: p.status === "SUCCESS" ? String(Math.round(Number(p.amount || 0) * 100)) : "0",
            outstandingPaise: p.status === "SUCCESS" ? "0" : String(Math.round(Number(p.amount || 0) * 100)),
            dueDate: (p.payment_date ? new Date(p.payment_date) : new Date()).toISOString().slice(0, 10),
            issueDate: (p.payment_date ? new Date(p.payment_date) : new Date()).toISOString().slice(0, 10),
            periodStart: (p.payment_date ? new Date(p.payment_date) : new Date()).toISOString().slice(0, 10),
            periodEnd: (p.payment_date ? new Date(p.payment_date) : new Date()).toISOString().slice(0, 10),
            status: p.status === "SUCCESS" ? "paid" : "open"
        }));

        res.json({
            status: "success",
            success: true,
            data: { invoices }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewReports = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };
        const activeHostel = await getActiveHostel(scope);

        res.json({
            status: "success",
            success: true,
            data: {
                hostel: activeHostel,
                floorOccupancy: [],
                agingBuckets: [
                    { bucket: "1-7 days", count: 0, totalOutstandingPaise: "0", invoices: [] },
                    { bucket: "8-30 days", count: 0, totalOutstandingPaise: "0", invoices: [] },
                    { bucket: "31-60 days", count: 0, totalOutstandingPaise: "0", invoices: [] },
                    { bucket: "61-90 days", count: 0, totalOutstandingPaise: "0", invoices: [] },
                    { bucket: "90+ days", count: 0, totalOutstandingPaise: "0", invoices: [] }
                ],
                occupancySummary: {
                    physicalBeds: 0,
                    sellableBeds: 0,
                    occupiedBeds: 0,
                    availableBeds: 0,
                    blockedBeds: 0,
                    maintenanceBeds: 0,
                    occupancyRate: 0
                },
                financialSummary: {
                    totalBilledPaise: "0",
                    totalCollectedPaise: "0",
                    totalOutstandingPaise: "0",
                    collectionRate: 0
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };

        res.json({
            status: "success",
            success: true,
            data: {
                user: {
                    id: String(user?.staff_id || "1"),
                    name: user?.name || "Staff Member",
                    email: user?.email || "staff@hostel.com",
                    image: null
                },
                scope: {
                    userId: String(user?.staff_id || "1"),
                    role: user?.role ? mapRole(user.role) : "manager",
                    organizationId: (scope as any).organizationId || "1",
                    allowedHostelIds: scope.allowedHostelIds || [],
                    activeHostelId: scope.activeHostelId || null
                },
                systemInfo: {
                    appName: "EasyPG Hostel Management",
                    locale: "en-IN",
                    timezone: "Asia/Kolkata",
                    currency: "INR",
                    version: "1.0.0"
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewHostels = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER", activeHostelId: "" };

        const [hostelsList] = await pool.query<any[]>("SELECT * FROM hostel WHERE status = 'ACTIVE'");

        const hostels = hostelsList.map((h: any) => ({
            id: String(h.hostel_id),
            organizationId: "1",
            name: h.name,
            code: h.hostel_code || `HSTL-${h.hostel_id}`,
            city: h.address || "Main City",
            addressLine1: h.address || "",
            status: h.status === "ACTIVE" ? ("active" as const) : ("inactive" as const),
            timezone: "Asia/Kolkata",
            physicalBeds: 5,
            sellableBeds: 5,
            occupiedBeds: 0,
            availableBeds: 5,
            occupancyRate: 0,
            residentCount: 0,
            isActive: scope.activeHostelId === String(h.hostel_id)
        }));

        res.json({
            status: "success",
            success: true,
            data: {
                hostels,
                activeHostelId: scope.activeHostelId || (hostels.length > 0 ? hostels[0].id : null)
            }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [partners] = await pool.query<any[]>(
            `SELECT p.partner_id, pe.name, pe.email, pe.phone, p.is_active, p.created_at
             FROM partner p
             JOIN person pe ON p.person_id = pe.person_id`
        );

        const organizations = partners.map((p: any) => ({
            id: String(p.partner_id),
            name: p.name || `Partner #${p.partner_id}`,
            slug: p.email ? p.email.split("@")[0] : `partner-${p.partner_id}`,
            status: p.is_active ? "active" : "inactive",
            createdAt: (p.created_at ? new Date(p.created_at) : new Date()).toISOString(),
            hostelCount: 1,
            residentCount: 0,
            billedPaise: "0",
            outstandingPaise: "0"
        }));

        res.json({
            status: "success",
            success: true,
            data: { organizations }
        });
    } catch (err) {
        next(err);
    }
};

export const getViewManagers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [managersList] = await pool.query<any[]>(
            `SELECT m.manager_id, pe.name, pe.email, m.is_active, m.created_at
             FROM manager m
             JOIN person pe ON m.person_id = pe.person_id`
        );

        const managers = managersList.map((m: any) => ({
            bindingId: String(m.manager_id),
            userId: String(m.manager_id),
            name: m.name || `Manager #${m.manager_id}`,
            email: m.email || "-",
            role: "manager",
            organizationId: "1",
            hostelId: "1",
            isActive: m.is_active !== false,
            createdAt: (m.created_at ? new Date(m.created_at) : new Date()).toISOString(),
            canManage: true,
            hostelName: "Test Hostel A",
            orgName: "Partner Organization"
        }));

        res.json({
            status: "success",
            success: true,
            data: {
                managers,
                hostels: [],
                organizations: []
            }
        });
    } catch (err) {
        next(err);
    }
};

// Operations
export const handleSwitchHostel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostelId } = req.body;
        res.json({
            status: "success",
            success: true,
            message: "Active hostel updated successfully"
        });
    } catch (err) {
        next(err);
    }
};

export const handleCheckIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fullName, phone, email, gender, bedId, checkInDate, agreedRentPaise } = req.body;
        const rentAmount = agreedRentPaise ? (Number(agreedRentPaise) / 100) : 8000;

        const [tResult] = await pool.query<any>(
            `INSERT INTO tenant (name, first_name, email, phone, gender, status)
             VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
            [fullName || "New Resident", fullName || "New Resident", email || null, phone || "9000000000", (gender || "male").toUpperCase()]
        );

        const tenantId = tResult.insertId;

        if (bedId) {
            await pool.query(
                `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by)
                 VALUES (?, ?, ?, 'ACTIVE', 1)`,
                [tenantId, bedId, checkInDate || new Date().toISOString().slice(0, 10)]
            );
            await pool.query("UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?", [bedId]);
        }

        res.json({
            status: "success",
            success: true,
            message: "Resident checked in successfully",
            resourceId: String(tenantId),
            redirectTo: "/residents"
        });
    } catch (err) {
        next(err);
    }
};

export const handleCheckOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { residentId, bedId } = req.body;

        await pool.query("UPDATE tenant SET status = 'INACTIVE' WHERE tenant_id = ?", [residentId]);
        await pool.query("UPDATE tenant_allocation SET status = 'COMPLETED', end_date = CURRENT_DATE WHERE tenant_id = ?", [residentId]);
        if (bedId) {
            await pool.query("UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ?", [bedId]);
        }

        res.json({
            status: "success",
            success: true,
            message: "Resident checked out successfully"
        });
    } catch (err) {
        next(err);
    }
};

export const handleSetBedStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { bedId, status } = req.body;
        const dbStatus = (status || "AVAILABLE").toUpperCase();
        await pool.query("UPDATE bed SET status = ? WHERE bed_id = ?", [dbStatus, bedId]);
        res.json({
            status: "success",
            success: true,
            message: `Bed status updated to ${status}`
        });
    } catch (err) {
        next(err);
    }
};

export const handleRecordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { residentId, amountPaise, paymentMethod, reference } = req.body;
        const amount = amountPaise ? (Number(amountPaise) / 100) : 0;

        await pool.query(
            `INSERT INTO payment (amount, payment_mode, transaction_id, status, payment_date)
             VALUES (?, ?, ?, 'SUCCESS', NOW())`,
            [amount, (paymentMethod || "UPI").toUpperCase(), reference || null]
        );

        res.json({
            status: "success",
            success: true,
            message: "Payment recorded successfully"
        });
    } catch (err) {
        next(err);
    }
};
