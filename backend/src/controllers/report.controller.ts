import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { buildUserScope } from "../utils/scope";

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        let hostelFilter = "1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({
                        status: "success",
                        data: {
                            total_hostels: 0,
                            active_tenants: 0,
                            beds: { total: 0, occupied: 0, available: 0, maintenance: 0, occupancy_rate_percent: 0 },
                            total_revenue_collected: 0,
                            total_expenses: 0,
                            open_complaints: 0,
                            currently_checked_in_visitors: 0
                        }
                    });
                }
                hostelFilter = "h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        // Bed stats
        const [bedStats] = await pool.query<any[]>(`
            SELECT
                COUNT(b.bed_id) as total_beds,
                SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_beds,
                SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_beds,
                SUM(CASE WHEN b.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_beds
            FROM bed b
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE h.status = 'ACTIVE' AND ${hostelFilter}
        `, params);

        // Hostel count
        const [hostelCount] = await pool.query<any[]>(`SELECT COUNT(*) as count FROM hostel h WHERE h.status = 'ACTIVE' AND ${hostelFilter}`, params);

        // Tenant count (in scoped hostels)
        const [tenantCount] = await pool.query<any[]>(`
            SELECT COUNT(DISTINCT t.tenant_id) as count
            FROM tenant t
            JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            JOIN bed b ON ta.bed_id = b.bed_id
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE t.status = 'ACTIVE' AND ${hostelFilter}
        `, params);

        // Revenue sum
        const [revenueSum] = await pool.query<any[]>(`
            SELECT COALESCE(SUM(p.amount), 0) as total
            FROM payment p
            LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE p.status = 'SUCCESS' AND (${hostelFilter} OR p.allocation_id IS NULL)
        `, params);

        // Expenses sum
        const [expenseSum] = await pool.query<any[]>(`
            SELECT COALESCE(SUM(e.amount), 0) as total
            FROM expense e
            JOIN hostel h ON e.hostel_id = h.hostel_id
            WHERE e.status != 'REJECTED' AND ${hostelFilter}
        `, params);

        // Open complaints
        const [openComplaints] = await pool.query<any[]>(`
            SELECT COUNT(mc.complaint_id) as count
            FROM maintenance_complaint mc
            LEFT JOIN tenant t ON mc.tenant_id = t.tenant_id
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE mc.status IN ('OPEN', 'UNDER_REVIEW') AND (${hostelFilter} OR h.hostel_id IS NULL)
        `, params);

        // Active visits
        const [activeVisits] = await pool.query<any[]>(`
            SELECT COUNT(v.visit_id) as count
            FROM visit v
            JOIN hostel h ON v.hostel_id = h.hostel_id
            WHERE v.status = 'CHECKED_IN' AND ${hostelFilter}
        `, params);

        const totalBeds = Number(bedStats[0].total_beds || 0);
        const occupiedBeds = Number(bedStats[0].occupied_beds || 0);
        const occupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(2)) : 0;

        res.json({
            status: "success",
            data: {
                total_hostels: hostelCount[0].count,
                active_tenants: tenantCount[0].count,
                beds: {
                    total: totalBeds,
                    occupied: occupiedBeds,
                    available: Number(bedStats[0].available_beds || 0),
                    maintenance: Number(bedStats[0].maintenance_beds || 0),
                    occupancy_rate_percent: occupancyRate
                },
                total_revenue_collected: Number(revenueSum[0].total || 0),
                total_expenses: Number(expenseSum[0].total || 0),
                open_complaints: openComplaints[0].count,
                currently_checked_in_visitors: activeVisits[0].count
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getOccupancyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        let hostelFilter = "1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", data: [] });
                }
                hostelFilter = "h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        const [rows] = await pool.query<any[]>(`
            SELECT
                h.hostel_id,
                h.name as hostel_name,
                COUNT(DISTINCT r.room_id) as total_rooms,
                COUNT(DISTINCT b.bed_id) as total_beds,
                SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_beds,
                SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_beds,
                SUM(CASE WHEN b.status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_beds
            FROM hostel h
            LEFT JOIN floor f ON h.hostel_id = f.hostel_id
            LEFT JOIN room r ON f.floor_id = r.floor_id
            LEFT JOIN bed b ON r.room_id = b.room_id
            WHERE h.status = 'ACTIVE' AND ${hostelFilter}
            GROUP BY h.hostel_id, h.name
            ORDER BY h.hostel_id
        `, params);

        const formatted = rows.map((r) => {
            const total = Number(r.total_beds || 0);
            const occupied = Number(r.occupied_beds || 0);
            return {
                ...r,
                total_beds: total,
                occupied_beds: occupied,
                available_beds: Number(r.available_beds || 0),
                maintenance_beds: Number(r.maintenance_beds || 0),
                occupancy_rate_percent: total > 0 ? Number(((occupied / total) * 100).toFixed(2)) : 0
            };
        });

        res.json({
            status: "success",
            data: formatted
        });
    } catch (error) {
        next(error);
    }
};

export const getRevenueReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        let hostelFilter = "1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", data: { by_payment_type: [], by_payment_method: [] } });
                }
                hostelFilter = "h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        // Breakdown by type
        const [byType] = await pool.query<any[]>(`
            SELECT p.payment_type, SUM(p.amount) as total_amount, COUNT(*) as transaction_count
            FROM payment p
            LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE p.status = 'SUCCESS' AND (${hostelFilter} OR p.allocation_id IS NULL)
            GROUP BY p.payment_type
        `, params);

        // Breakdown by method
        const [byMethod] = await pool.query<any[]>(`
            SELECT p.payment_method, SUM(p.amount) as total_amount, COUNT(*) as transaction_count
            FROM payment p
            LEFT JOIN tenant_allocation ta ON p.allocation_id = ta.allocation_id
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE p.status = 'SUCCESS' AND (${hostelFilter} OR p.allocation_id IS NULL)
            GROUP BY p.payment_method
        `, params);

        res.json({
            status: "success",
            data: {
                by_payment_type: byType,
                by_payment_method: byMethod
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getMaintenanceReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        let hostelFilter = "1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", data: { complaints_by_status_priority: [], requests_by_status_priority: [] } });
                }
                hostelFilter = "h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        const [complaintStats] = await pool.query<any[]>(`
            SELECT mc.status, mc.priority, COUNT(*) as count
            FROM maintenance_complaint mc
            LEFT JOIN tenant t ON mc.tenant_id = t.tenant_id
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE (${hostelFilter} OR h.hostel_id IS NULL)
            GROUP BY mc.status, mc.priority
        `, params);

        const [requestStats] = await pool.query<any[]>(`
            SELECT mr.status, mr.priority, COUNT(*) as count
            FROM maintenance_request mr
            JOIN maintenance_complaint mc ON mr.complaint_id = mc.complaint_id
            LEFT JOIN tenant t ON mc.tenant_id = t.tenant_id
            LEFT JOIN tenant_allocation ta ON t.tenant_id = ta.tenant_id AND ta.status = 'ACTIVE'
            LEFT JOIN bed b ON ta.bed_id = b.bed_id
            LEFT JOIN room r ON b.room_id = r.room_id
            LEFT JOIN floor f ON r.floor_id = f.floor_id
            LEFT JOIN hostel h ON f.hostel_id = h.hostel_id
            WHERE (${hostelFilter} OR h.hostel_id IS NULL)
            GROUP BY mr.status, mr.priority
        `, params);

        res.json({
            status: "success",
            data: {
                complaints_by_status_priority: complaintStats,
                requests_by_status_priority: requestStats
            }
        });
    } catch (error) {
        next(error);
    }
};
