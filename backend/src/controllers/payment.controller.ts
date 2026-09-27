import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceTenantAdminResponsibility } from "../utils/scope";

export const getAllPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenant_id, payment_type, status, from_date, to_date } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT p.*, t.name as tenant_name, t.phone as tenant_phone, s.name as recorded_by_staff
            FROM payment p
            JOIN tenant t ON p.tenant_id = t.tenant_id
            JOIN staff s ON p.recorded_by = s.staff_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += ` AND (p.tenant_id IN (
                    SELECT ta.tenant_id FROM tenant_allocation ta
                    JOIN bed b ON ta.bed_id = b.bed_id
                    JOIN room r ON b.room_id = r.room_id
                    JOIN floor f ON r.floor_id = f.floor_id
                    WHERE f.hostel_id IN (?)
                ) OR p.tenant_id IS NOT NULL)`;
                params.push(scope.allowedHostelIds);
            }
        }

        if (tenant_id) {
            query += " AND p.tenant_id = ?";
            params.push(tenant_id);
        }

        if (payment_type) {
            query += " AND p.payment_type = ?";
            params.push(payment_type);
        }

        if (status) {
            query += " AND p.status = ?";
            params.push(status);
        }

        if (from_date) {
            query += " AND p.payment_date >= ?";
            params.push(from_date);
        }

        if (to_date) {
            query += " AND p.payment_date <= ?";
            params.push(to_date);
        }

        query += " ORDER BY p.payment_date DESC";

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

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paymentId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [rows] = await pool.query<any[]>(
            `SELECT p.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
                    s.name as recorded_by_staff, s.role as staff_role
             FROM payment p
             JOIN tenant t ON p.tenant_id = t.tenant_id
             JOIN staff s ON p.recorded_by = s.staff_id
             WHERE p.payment_id = ?`,
            [paymentId]
        );

        if (rows.length === 0) {
            return next(new AppError("Payment record not found", 404));
        }

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        res.json({
            status: "success",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

export const recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            tenant_id,
            allocation_id,
            amount,
            payment_type,
            payment_method,
            transaction_reference,
            status
        } = req.body;
        const currentUser = (req as any).user;
        const recorded_by = currentUser?.staff_id;

        if (!tenant_id || !amount || !payment_type) {
            return next(new AppError("tenant_id, amount, and payment_type are required", 400));
        }

        if (Number(amount) <= 0) {
            return next(new AppError("Payment amount must be greater than 0", 400));
        }

        if (!recorded_by) {
            return next(new AppError("Staff ID not found in session", 401));
        }

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        // Verify tenant existence
        const [tenant] = await pool.query<any[]>("SELECT tenant_id FROM tenant WHERE tenant_id = ?", [tenant_id]);
        if (tenant.length === 0) return next(new AppError("Tenant not found", 404));

        // Verify allocation existence if passed
        if (allocation_id) {
            const [alloc] = await pool.query<any[]>(
                "SELECT allocation_id FROM tenant_allocation WHERE allocation_id = ? AND tenant_id = ?",
                [allocation_id, tenant_id]
            );
            if (alloc.length === 0) {
                return next(new AppError("Allocation not found for this tenant", 400));
            }
        }

        const [result] = await pool.query<any>(
            `INSERT INTO payment (
                tenant_id, allocation_id, amount, payment_type,
                payment_method, transaction_reference, status, recorded_by
            ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 'SUCCESS'), ?)`,
            [
                tenant_id,
                allocation_id || null,
                amount,
                payment_type,
                payment_method || null,
                transaction_reference || null,
                status,
                recorded_by
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Payment recorded successfully",
            data: {
                payment_id: result.insertId,
                tenant_id,
                amount,
                payment_type,
                payment_method,
                transaction_reference,
                status: status || "SUCCESS",
                recorded_by
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updatePaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paymentId = Number(req.params.id);
        const { status } = req.body;
        const currentUser = (req as any).user;

        if (!status || !["PENDING", "SUCCESS", "FAILED", "REFUNDED"].includes(status)) {
            return next(new AppError("Valid status required ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')", 400));
        }

        const [existing] = await pool.query<any[]>("SELECT payment_id FROM payment WHERE payment_id = ?", [paymentId]);
        if (existing.length === 0) return next(new AppError("Payment record not found", 404));

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        await pool.query("UPDATE payment SET status = ? WHERE payment_id = ?", [status, paymentId]);

        res.json({
            status: "success",
            message: `Payment status updated to ${status}`
        });
    } catch (error) {
        next(error);
    }
};

export const getReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const paymentId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [rows] = await pool.query<any[]>(
            `SELECT p.*, t.name as tenant_name, t.email as tenant_email, t.phone as tenant_phone,
                    s.name as recorded_by_staff, s.role as staff_role
             FROM payment p
             JOIN tenant t ON p.tenant_id = t.tenant_id
             JOIN staff s ON p.recorded_by = s.staff_id
             WHERE p.payment_id = ?`,
            [paymentId]
        );

        if (rows.length === 0) {
            return next(new AppError("Payment record not found", 404));
        }

        const payment = rows[0];

        // Rule: Payment MUST succeed before a receipt is created/issued
        if (payment.status !== "SUCCESS") {
            return next(new AppError("Receipt can only be generated for successful payments", 400));
        }

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            enforceTenantAdminResponsibility(scope);
        }

        const receipt = {
            receipt_number: `REC-${payment.payment_id}-${new Date(payment.payment_date).getTime()}`,
            payment_id: payment.payment_id,
            tenant_id: payment.tenant_id,
            tenant_name: payment.tenant_name,
            tenant_email: payment.tenant_email,
            tenant_phone: payment.tenant_phone,
            amount: payment.amount,
            payment_type: payment.payment_type,
            payment_method: payment.payment_method,
            transaction_reference: payment.transaction_reference,
            payment_date: payment.payment_date,
            issued_by: payment.recorded_by_staff,
            status: "ISSUED"
        };

        res.json({
            status: "success",
            data: receipt
        });
    } catch (error) {
        next(error);
    }
};
