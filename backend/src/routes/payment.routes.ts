import { Router } from "express";
import {
    getAllPayments,
    getPaymentById,
    recordPayment,
    updatePaymentStatus,
    getReceipt
} from "../controllers/payment.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllPayments);
router.get("/:id", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getPaymentById);
router.get("/:id/receipt", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getReceipt);
router.post("/", authorizeRoles("HEAD", "MANAGER", "ADMIN", "SUPERVISOR"), recordPayment);
router.patch("/:id/status", authorizeRoles("HEAD", "PARTNER", "MANAGER", "ADMIN"), updatePaymentStatus);

export default router;
