import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope, enforceTenantAdminResponsibility, getHostelIdFromBed } from "../utils/scope";

export const getAllAllocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, tenant_id, hostel_id } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT ta.*, t.name as tenant_name, t.phone as tenant_phone,
                   b.bed_number, r.room_number, r.room_id, f.floor_number,
                   h.hostel_id, h.name as hostel_name, s.name as allocated_by_staff
            FROM tenant_allocation ta
            JOIN tenant t ON ta.tenant_id = t.tenant_id
            JOIN bed b ON ta.bed_id = b.bed_id
            JOIN room r ON b.room_id = r.room_id
            JOIN floor f ON r.floor_id = f.floor_id
            JOIN hostel h ON f.hostel_id = h.hostel_id
            JOIN staff s ON ta.allocated_by = s.staff_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND h.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (status) {
            query += " AND ta.status = ?";
            params.push(status);
        }

        if (tenant_id) {
            query += " AND ta.tenant_id = ?";
            params.push(tenant_id);
        }

        if (hostel_id) {
            query += " AND h.hostel_id = ?";
            params.push(hostel_id);
        }

        query += " ORDER BY ta.allocation_id DESC";

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

export const allocateBed = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const { tenant_id, bed_id, start_date } = req.body;
        const currentUser = (req as any).user;
        const allocated_by = currentUser?.staff_id;

        if (!tenant_id || !bed_id || !start_date) {
            return next(new AppError("tenant_id, bed_id, and start_date are required", 400));
        }

        if (!allocated_by) {
            return next(new AppError("Staff ID not found in session", 401));
        }

        // Scope enforcement
        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
            const hostelId = await getHostelIdFromBed(bed_id);
            enforceHostelScope(scope, hostelId);
        }

        // 1. Verify tenant exists and active
        const [tenants] = await connection.query<any[]>(
            "SELECT tenant_id, status FROM tenant WHERE tenant_id = ?",
            [tenant_id]
        );

        if (tenants.length === 0) {
            return next(new AppError("Tenant not found", 404));
        }

        if (tenants[0].status !== "ACTIVE") {
            return next(new AppError("Tenant is not active", 400));
        }

        // 2. Verify tenant doesn't already have an active allocation
        const [activeAlloc] = await connection.query<any[]>(
            "SELECT allocation_id FROM tenant_allocation WHERE tenant_id = ? AND status = 'ACTIVE'",
            [tenant_id]
        );

        if (activeAlloc.length > 0) {
            return next(new AppError("Tenant already has an active bed allocation", 400));
        }

        // 3. Verify bed exists and status is AVAILABLE
        const [beds] = await connection.query<any[]>(
            `SELECT b.bed_id, b.status, b.room_id, r.capacity
             FROM bed b
             JOIN room r ON b.room_id = r.room_id
             WHERE b.bed_id = ?`,
            [bed_id]
        );

        if (beds.length === 0) {
            return next(new AppError("Bed not found", 404));
        }

        if (beds[0].status !== "AVAILABLE") {
            return next(new AppError(`Bed is not available. Current status: '${beds[0].status}'`, 400));
        }

        const roomId = beds[0].room_id;
        const roomCapacity = beds[0].capacity;

        // Start Transaction
        await connection.beginTransaction();

        // A. Insert allocation record
        const [allocResult] = await connection.query<any>(
            `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by)
             VALUES (?, ?, ?, 'ACTIVE', ?)`,
            [tenant_id, bed_id, start_date, allocated_by]
        );

        // B. Update bed status to OCCUPIED
        await connection.query(
            "UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?",
            [bed_id]
        );

        // C. Check total occupied beds in room to see if room is now FULL
        const [roomBeds] = await connection.query<any[]>(
            "SELECT COUNT(*) as occupied_count FROM bed WHERE room_id = ? AND status = 'OCCUPIED'",
            [roomId]
        );

        if (roomBeds[0].occupied_count >= roomCapacity) {
            await connection.query(
                "UPDATE room SET status = 'FULL' WHERE room_id = ?",
                [roomId]
            );
        }

        await connection.commit();

        res.status(201).json({
            status: "success",
            message: "Bed allocated successfully",
            data: {
                allocation_id: allocResult.insertId,
                tenant_id,
                bed_id,
                start_date,
                allocated_by
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const checkoutTenant = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const allocationId = Number(req.params.id);
        const { end_date } = req.body;
        const currentUser = (req as any).user;

        const checkOutDate = end_date || new Date().toISOString().split("T")[0];

        // 1. Get allocation details
        const [allocations] = await connection.query<any[]>(
            "SELECT * FROM tenant_allocation WHERE allocation_id = ?",
            [allocationId]
        );

        if (allocations.length === 0) {
            return next(new AppError("Allocation record not found", 404));
        }

        const allocation = allocations[0];

        if (allocation.status !== "ACTIVE") {
            return next(new AppError("Allocation is not active", 400));
        }

        // Scope enforcement
        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
            const hostelId = await getHostelIdFromBed(allocation.bed_id);
            enforceHostelScope(scope, hostelId);
        }

        if (new Date(checkOutDate) < new Date(allocation.start_date)) {
            return next(new AppError("Checkout end_date cannot be earlier than start_date", 400));
        }

        // Get room details
        const [beds] = await connection.query<any[]>(
            "SELECT room_id FROM bed WHERE bed_id = ?",
            [allocation.bed_id]
        );
        const roomId = beds.length > 0 ? beds[0].room_id : null;

        // Start Transaction
        await connection.beginTransaction();

        // A. Complete allocation
        await connection.query(
            "UPDATE tenant_allocation SET status = 'COMPLETED', end_date = ? WHERE allocation_id = ?",
            [checkOutDate, allocationId]
        );

        // B. Set bed status back to AVAILABLE
        await connection.query(
            "UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ?",
            [allocation.bed_id]
        );

        // C. If room was marked FULL, update room status back to AVAILABLE
        if (roomId) {
            await connection.query(
                "UPDATE room SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'FULL'",
                [roomId]
            );
        }

        await connection.commit();

        res.json({
            status: "success",
            message: "Tenant checked out successfully",
            data: {
                allocation_id: allocationId,
                end_date: checkOutDate,
                status: "COMPLETED"
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};

export const transferBed = async (req: Request, res: Response, next: NextFunction) => {
    const connection = await pool.getConnection();
    try {
        const allocationIdFromParam = req.params.id ? Number(req.params.id) : null;
        const { allocation_id, tenant_id, new_bed_id, transfer_date } = req.body;
        const currentUser = (req as any).user;
        const allocated_by = currentUser?.staff_id;

        const effectiveAllocationId = allocationIdFromParam || allocation_id;

        if (!new_bed_id) {
            return next(new AppError("new_bed_id is required for transfer", 400));
        }

        if (!allocated_by) {
            return next(new AppError("Staff ID not found in session", 401));
        }

        // 1. Find active allocation
        let currentAlloc: any = null;
        if (effectiveAllocationId) {
            const [allocs] = await connection.query<any[]>(
                "SELECT * FROM tenant_allocation WHERE allocation_id = ? AND status = 'ACTIVE'",
                [effectiveAllocationId]
            );
            if (allocs.length > 0) currentAlloc = allocs[0];
        } else if (tenant_id) {
            const [allocs] = await connection.query<any[]>(
                "SELECT * FROM tenant_allocation WHERE tenant_id = ? AND status = 'ACTIVE'",
                [tenant_id]
            );
            if (allocs.length > 0) currentAlloc = allocs[0];
        }

        if (!currentAlloc) {
            return next(new AppError("No active allocation found for transfer", 404));
        }

        const oldBedId = currentAlloc.bed_id;
        if (oldBedId === new_bed_id) {
            return next(new AppError("Tenant is already assigned to this bed", 400));
        }

        // 2. Validate new bed availability
        const [newBeds] = await connection.query<any[]>(
            `SELECT b.bed_id, b.status, b.room_id, r.capacity
             FROM bed b
             JOIN room r ON b.room_id = r.room_id
             WHERE b.bed_id = ?`,
            [new_bed_id]
        );

        if (newBeds.length === 0) {
            return next(new AppError("Target bed not found", 404));
        }

        if (newBeds[0].status !== "AVAILABLE") {
            return next(new AppError(`Target bed is not available. Status: '${newBeds[0].status}'`, 400));
        }

        // Scope check for old bed and new bed
        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
            const oldHostelId = await getHostelIdFromBed(oldBedId);
            const newHostelId = await getHostelIdFromBed(new_bed_id);
            enforceHostelScope(scope, oldHostelId);
            enforceHostelScope(scope, newHostelId);
        }

        const effectiveTransferDate = transfer_date || new Date().toISOString().split("T")[0];

        // Fetch old bed's room info
        const [oldBeds] = await connection.query<any[]>(
            "SELECT room_id FROM bed WHERE bed_id = ?",
            [oldBedId]
        );
        const oldRoomId = oldBeds.length > 0 ? oldBeds[0].room_id : null;
        const newRoomId = newBeds[0].room_id;
        const newRoomCapacity = newBeds[0].capacity;

        // Transaction: Preserve history
        await connection.beginTransaction();

        // Step A: Close old allocation without deleting history
        await connection.query(
            "UPDATE tenant_allocation SET status = 'COMPLETED', end_date = ? WHERE allocation_id = ?",
            [effectiveTransferDate, currentAlloc.allocation_id]
        );

        // Step B: Set old bed to AVAILABLE
        await connection.query(
            "UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ?",
            [oldBedId]
        );

        // Step C: Update old room status if needed
        if (oldRoomId) {
            await connection.query(
                "UPDATE room SET status = 'AVAILABLE' WHERE room_id = ? AND status = 'FULL'",
                [oldRoomId]
            );
        }

        // Step D: Create new allocation record
        const [newAllocResult] = await connection.query<any>(
            `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by)
             VALUES (?, ?, ?, 'ACTIVE', ?)`,
            [currentAlloc.tenant_id, new_bed_id, effectiveTransferDate, allocated_by]
        );

        // Step E: Set new bed to OCCUPIED
        await connection.query(
            "UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?",
            [new_bed_id]
        );

        // Step F: Update new room status if capacity full
        const [newRoomOccupied] = await connection.query<any[]>(
            "SELECT COUNT(*) as occupied_count FROM bed WHERE room_id = ? AND status = 'OCCUPIED'",
            [newRoomId]
        );

        if (newRoomOccupied[0].occupied_count >= newRoomCapacity) {
            await connection.query(
                "UPDATE room SET status = 'FULL' WHERE room_id = ?",
                [newRoomId]
            );
        }

        await connection.commit();

        res.json({
            status: "success",
            message: "Tenant bed transferred successfully while preserving history",
            data: {
                previous_allocation_id: currentAlloc.allocation_id,
                new_allocation_id: newAllocResult.insertId,
                tenant_id: currentAlloc.tenant_id,
                old_bed_id: oldBedId,
                new_bed_id: new_bed_id,
                transfer_date: effectiveTransferDate
            }
        });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
};
