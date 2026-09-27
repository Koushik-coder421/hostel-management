import { Router } from "express";
import { registerStaff, loginStaff, getProfile } from "../controllers/auth.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.post("/register", authenticateToken, authorizeRoles("ADMIN"), registerStaff);
router.post("/login", loginStaff);
router.get("/me", authenticateToken, getProfile);

export default router;
