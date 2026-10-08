import { Router } from "express";
import {
    getAllTenants,
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant,
    addTenantDocument,
    addEmergencyContact,
    addTenantPreference
} from "../controllers/tenant.controller";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

router.use(authenticateToken);

router.get("/", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getAllTenants);
router.get("/:id", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), getTenantById);
router.post("/", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), createTenant);
router.put("/:id", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), updateTenant);
router.delete("/:id", authorizeRoles("SUPERADMIN", "ADMIN"), deleteTenant);

router.post("/:id/documents", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), addTenantDocument);
router.post("/:id/emergency-contacts", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), addEmergencyContact);
router.post("/:id/preferences", authorizeRoles("SUPERADMIN", "HEAD", "PARTNER", "MANAGER", "ADMIN", "SUPERVISOR"), addTenantPreference);

export default router;
