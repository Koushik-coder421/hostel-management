import { Router } from "express";
import {
    getAllCategories,
    createCategory,
    getAllExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpenseSummary
} from "../controllers/expense.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/categories", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllCategories);
router.post("/categories", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), createCategory);

router.get("/summary", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), getExpenseSummary);
router.get("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllExpenses);
router.get("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getExpenseById);
router.post("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), createExpense);
router.put("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), updateExpense);
router.delete("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), deleteExpense);

export default router;
