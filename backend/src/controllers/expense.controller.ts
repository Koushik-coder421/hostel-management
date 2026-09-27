import { Request, Response, NextFunction } from "express";
import pool from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { buildUserScope, enforceHostelScope } from "../utils/scope";

// --- Expense Categories ---

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [rows] = await pool.query<any[]>(
            "SELECT * FROM expense_category WHERE status = 'ACTIVE' ORDER BY category_name ASC"
        );
        res.json({
            status: "success",
            results: rows.length,
            data: rows
        });
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { category_name, description, remarks } = req.body;

        if (!category_name) {
            return next(new AppError("category_name is required", 400));
        }

        const [existing] = await pool.query<any[]>(
            "SELECT expense_category_id FROM expense_category WHERE category_name = ?",
            [category_name]
        );
        if (existing.length > 0) {
            return next(new AppError("Expense category with this name already exists", 400));
        }

        const [result] = await pool.query<any>(
            `INSERT INTO expense_category (category_name, description, status, remarks)
             VALUES (?, ?, 'ACTIVE', ?)`,
            [category_name, description || null, remarks || null]
        );

        res.status(201).json({
            status: "success",
            message: "Expense category created successfully",
            data: {
                expense_category_id: result.insertId,
                category_name,
                description
            }
        });
    } catch (error) {
        next(error);
    }
};

// --- Expenses ---

export const getAllExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { hostel_id, category_id, status, from_date, to_date } = req.query;
        const currentUser = (req as any).user;

        let query = `
            SELECT e.*, h.name as hostel_name, ec.category_name, s1.name as recorded_by_staff, s2.name as approved_by_staff
            FROM expense e
            JOIN hostel h ON e.hostel_id = h.hostel_id
            JOIN expense_category ec ON e.expense_category_id = ec.expense_category_id
            JOIN staff s1 ON e.recorded_by = s1.staff_id
            LEFT JOIN staff s2 ON e.approved_by = s2.staff_id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", results: 0, data: [] });
                }
                query += " AND e.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        if (hostel_id) {
            query += " AND e.hostel_id = ?";
            params.push(hostel_id);
        }

        if (category_id) {
            query += " AND e.expense_category_id = ?";
            params.push(category_id);
        }

        if (status) {
            query += " AND e.status = ?";
            params.push(status);
        }

        if (from_date) {
            query += " AND e.expense_date >= ?";
            params.push(from_date);
        }

        if (to_date) {
            query += " AND e.expense_date <= ?";
            params.push(to_date);
        }

        query += " ORDER BY e.expense_date DESC, e.expense_id DESC";

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

export const getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expenseId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [rows] = await pool.query<any[]>(
            `SELECT e.*, h.name as hostel_name, ec.category_name, s1.name as recorded_by_staff
             FROM expense e
             JOIN hostel h ON e.hostel_id = h.hostel_id
             JOIN expense_category ec ON e.expense_category_id = ec.expense_category_id
             JOIN staff s1 ON e.recorded_by = s1.staff_id
             WHERE e.expense_id = ?`,
            [expenseId]
        );

        if (rows.length === 0) {
            return next(new AppError("Expense record not found", 404));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, rows[0].hostel_id);
        }

        res.json({
            status: "success",
            data: rows[0]
        });
    } catch (error) {
        next(error);
    }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            hostel_id,
            expense_category_id,
            amount,
            expense_date,
            description,
            maintenance_id,
            status,
            remarks
        } = req.body;
        const currentUser = (req as any).user;
        const recorded_by = currentUser?.staff_id;

        if (!hostel_id || !expense_category_id || !amount || !expense_date) {
            return next(new AppError("hostel_id, expense_category_id, amount, and expense_date are required", 400));
        }

        if (Number(amount) <= 0) {
            return next(new AppError("Expense amount must be greater than 0", 400));
        }

        if (!recorded_by) {
            return next(new AppError("Staff ID not found in session", 401));
        }

        if (currentUser) {
            await enforceHostelScope(currentUser, hostel_id);
        }

        // Verify hostel and category existence
        const [h] = await pool.query<any[]>("SELECT hostel_id FROM hostel WHERE hostel_id = ?", [hostel_id]);
        if (h.length === 0) return next(new AppError("Hostel not found", 404));

        const [c] = await pool.query<any[]>("SELECT expense_category_id FROM expense_category WHERE expense_category_id = ?", [expense_category_id]);
        if (c.length === 0) return next(new AppError("Expense category not found", 404));

        const [result] = await pool.query<any>(
            `INSERT INTO expense (
                hostel_id, expense_category_id, maintenance_id, amount, expense_date,
                description, recorded_by, status, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, 'APPROVED'), ?)`,
            [
                hostel_id,
                expense_category_id,
                maintenance_id || null,
                amount,
                expense_date,
                description || null,
                recorded_by,
                status,
                remarks || null
            ]
        );

        res.status(201).json({
            status: "success",
            message: "Expense recorded successfully",
            data: {
                expense_id: result.insertId,
                hostel_id,
                expense_category_id,
                amount,
                expense_date,
                status: status || "APPROVED"
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expenseId = Number(req.params.id);
        const currentUser = (req as any).user;
        const { amount, expense_date, description, status, remarks } = req.body;

        const [existing] = await pool.query<any[]>("SELECT expense_id, hostel_id FROM expense WHERE expense_id = ?", [expenseId]);
        if (existing.length === 0) return next(new AppError("Expense record not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query(
            `UPDATE expense
             SET amount = COALESCE(?, amount),
                 expense_date = COALESCE(?, expense_date),
                 description = COALESCE(?, description),
                 status = COALESCE(?, status),
                 remarks = COALESCE(?, remarks)
             WHERE expense_id = ?`,
            [amount, expense_date, description, status, remarks, expenseId]
        );

        res.json({
            status: "success",
            message: "Expense record updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const expenseId = Number(req.params.id);
        const currentUser = (req as any).user;

        const [existing] = await pool.query<any[]>("SELECT expense_id, hostel_id FROM expense WHERE expense_id = ?", [expenseId]);
        if (existing.length === 0) return next(new AppError("Expense record not found", 404));

        if (currentUser) {
            await enforceHostelScope(currentUser, existing[0].hostel_id);
        }

        await pool.query("UPDATE expense SET status = 'REJECTED' WHERE expense_id = ?", [expenseId]);

        res.json({
            status: "success",
            message: "Expense status set to REJECTED"
        });
    } catch (error) {
        next(error);
    }
};

export const getExpenseSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const currentUser = (req as any).user;
        let hostelFilter = "1=1";
        const params: any[] = [];

        if (currentUser) {
            const scope = await buildUserScope(currentUser);
            if (currentUser.role !== "SUPERADMIN" && currentUser.role !== "ADMIN") {
                if (scope.allowedHostelIds.length === 0) {
                    return res.json({ status: "success", data: { total_expenses: 0, by_category: [], by_hostel: [] } });
                }
                hostelFilter = "e.hostel_id IN (?)";
                params.push(scope.allowedHostelIds);
            }
        }

        const [totalRes] = await pool.query<any[]>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM expense e WHERE ${hostelFilter} AND e.status != 'REJECTED'`,
            params
        );

        const [byCategory] = await pool.query<any[]>(
            `SELECT ec.category_name, SUM(e.amount) as total_amount, COUNT(e.expense_id) as count
             FROM expense e
             JOIN expense_category ec ON e.expense_category_id = ec.expense_category_id
             WHERE ${hostelFilter} AND e.status != 'REJECTED'
             GROUP BY ec.expense_category_id, ec.category_name`,
            params
        );

        const [byHostel] = await pool.query<any[]>(
            `SELECT h.hostel_id, h.name as hostel_name, SUM(e.amount) as total_amount, COUNT(e.expense_id) as count
             FROM expense e
             JOIN hostel h ON e.hostel_id = h.hostel_id
             WHERE ${hostelFilter} AND e.status != 'REJECTED'
             GROUP BY h.hostel_id, h.name`,
            params
        );

        res.json({
            status: "success",
            data: {
                total_expenses: Number(totalRes[0].total || 0),
                by_category: byCategory,
                by_hostel: byHostel
            }
        });
    } catch (error) {
        next(error);
    }
};
