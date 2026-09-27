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

router.get("/", authorizeRoles("ADMIN", "SUPERVISOR"), getAllTenants);
router.get("/:id", authorizeRoles("ADMIN", "SUPERVISOR"), getTenantById);
router.post("/", authorizeRoles("ADMIN", "SUPERVISOR"), createTenant);
router.put("/:id", authorizeRoles("ADMIN", "SUPERVISOR"), updateTenant);
router.delete("/:id", authorizeRoles("ADMIN"), deleteTenant);

router.post("/:id/documents", authorizeRoles("ADMIN", "SUPERVISOR"), addTenantDocument);
router.post("/:id/emergency-contacts", authorizeRoles("ADMIN", "SUPERVISOR"), addEmergencyContact);
router.post("/:id/preferences", authorizeRoles("ADMIN", "SUPERVISOR"), addTenantPreference);

export default router;
