import { Router } from "express";
import authRoutes from "./auth.routes";
import staffRoutes from "./staff.routes";
import hostelRoutes from "./hostel.routes";
import floorRoutes from "./floor.routes";
import roomRoutes from "./room.routes";
import bedRoutes from "./bed.routes";
import facilityRoutes from "./facility.routes";
import tenantRoutes from "./tenant.routes";
import allocationRoutes from "./allocation.routes";
import paymentRoutes from "./payment.routes";
import visitorRoutes from "./visitor.routes";
import maintenanceRoutes from "./maintenance.routes";
import reportRoutes from "./report.routes";
import hierarchyRoutes from "./hierarchy.routes";
import streamRoutes from "./stream.routes";
import expenseRoutes from "./expense.routes";

import { loginStaff, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth";
import { buildUserScope } from "../utils/scope";

import pool from "../config/database";

const router = Router();

router.use("/auth", authRoutes);
router.post("/session", loginStaff);
router.get("/session", authenticateToken, getProfile);
router.delete("/session", (req, res) => res.json({ status: "success", success: true, message: "Signed out", data: {} }));

router.get("/views/*splat", authenticateToken, async (req, res, next) => {
    try {
        const user = (req as any).user;
        const role = user ? user.role : "MANAGER";
        const scope = user ? await buildUserScope(user) : { allowedHostelIds: [], role: "MANAGER" };

        const isGlobalAdmin = role === "SUPERADMIN" || role === "ADMIN";

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

        const mappedRole = role === "SUPERADMIN" || role === "ADMIN" || role === "HEAD"
            ? "platform_admin"
            : role === "PARTNER"
            ? "organization_admin"
            : "manager";

        res.json({
            status: "success",
            success: true,
            data: {
                role: mappedRole,
                platformData: {
                    activeOrganizations: Number(total_partners || 0),
                    activeHostels: Number(total_hostels || 0),
                    activeResidents: Number(total_tenants || 0),
                    totalOutstandingPaise: "0",
                    currentMonthBilledPaise: String(Math.round(Number(total_revenue || 0) * 100)),
                    currentMonthCollectedPaise: String(Math.round(Number(total_revenue || 0) * 100)),
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
                },
                orgData: {
                    organizationName: partnersList.length > 0 ? `${partnersList[0].name} Portfolio` : "Organization Portfolio",
                    hostelCount: Number(total_hostels || 0),
                    totalResidents: Number(total_tenants || 0),
                    occupancyRate: total_beds > 0 ? Number(((occupied_beds / total_beds) * 100).toFixed(1)) : 0,
                    occupiedBeds: Number(occupied_beds || 0),
                    sellableBeds: Number(total_beds || 0),
                    availableBeds: Math.max(0, Number(total_beds || 0) - Number(occupied_beds || 0)),
                    physicalBeds: Number(total_beds || 0),
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
                        outstandingPaise: 0
                    }))
                },
                managerData: {
                    hostelName: hostelsList.length > 0 ? hostelsList[0].name : "Assigned Property",
                    occupancyRate: total_beds > 0 ? Number(((occupied_beds / total_beds) * 100).toFixed(1)) : 0,
                    occupiedBeds: Number(occupied_beds || 0),
                    sellableBeds: Number(total_beds || 0),
                    availableBeds: Math.max(0, Number(total_beds || 0) - Number(occupied_beds || 0)),
                    blockedBeds: 0,
                    activeResidents: Number(occupied_beds || 0),
                    overdueInvoices: 0,
                    collectionsTodayPaise: String(Math.round(Number(total_revenue || 0) * 100)),
                    paymentsDueToday: 0,
                    expectedCheckouts: 0,
                    recentActivity: [],
                    overdueInvoicesList: []
                },
                managers: [],
                residents: [],
                rooms: []
            }
        });
    } catch (err) {
        next(err);
    }
});

router.use("/staff", staffRoutes);
router.use("/hostels", hostelRoutes);
router.use("/floors", floorRoutes);
router.use("/rooms", roomRoutes);
router.use("/beds", bedRoutes);
router.use("/facilities", facilityRoutes);
router.use("/tenants", tenantRoutes);
router.use("/allocations", allocationRoutes);
router.use("/payments", paymentRoutes);
router.use("/expenses", expenseRoutes);
router.use("/visitors", visitorRoutes);
router.use("/maintenance", maintenanceRoutes);
router.use("/reports", reportRoutes);
router.use("/hierarchy", hierarchyRoutes);
router.use("/streams", streamRoutes);

export default router;
