import pool from "../config/database";
import bcrypt from "bcryptjs";

export const resetDatabase = async () => {
    console.log("🧹 Wiping database records for clean manual testing...");

    try {
        await pool.query("SET FOREIGN_KEY_CHECKS = 0");

        const tables = [
            "visit_tenant",
            "visit",
            "visitor",
            "expense",
            "maintenance_update",
            "maintenance_request",
            "maintenance_complaint",
            "maintenance_target",
            "expense_category",
            "receipt",
            "payment",
            "rent",
            "rent_structure",
            "tenant_allocation",
            "tenant_stay",
            "tenant_preference",
            "emergency_contact",
            "tenant_document",
            "tenant",
            "hostel_facility",
            "facility",
            "bed",
            "room",
            "floor",
            "hostel_supervisor_assignment",
            "manager_hostel_assignment",
            "partner_hostel_assignment",
            "partner_manager_assignment",
            "head_partner_assignment",
            "hostel_staff",
            "hostel",
            "supervisor",
            "manager",
            "partner",
            "head",
            "role_assignment",
            "role",
            "superadmin",
            "person",
            "staff"
        ];

        for (const table of tables) {
            await pool.query(`TRUNCATE TABLE ${table}`);
        }

        await pool.query("SET FOREIGN_KEY_CHECKS = 1");
        console.log("  ✅ All database tables truncated clean");

        // Seed basic admin accounts for login
        const adminPass = await bcrypt.hash("admin123", 10);
        const superPass = await bcrypt.hash("super123", 10);
        const maintPass = await bcrypt.hash("maint123", 10);

        await pool.query(`
            INSERT INTO staff (staff_id, name, email, password_hash, phone, role, status)
            VALUES
                (1, 'System Admin', 'admin@hostel.com', ?, '9876543210', 'ADMIN', 'ACTIVE'),
                (2, 'Hostel Supervisor', 'supervisor@hostel.com', ?, '9876543211', 'SUPERVISOR', 'ACTIVE'),
                (3, 'Maintenance Staff', 'maint@hostel.com', ?, '9876543212', 'MAINTENANCE_STAFF', 'ACTIVE');
        `, [adminPass, superPass, maintPass]);

        await pool.query(`
            INSERT INTO person (person_id, name, email, phone, date_of_birth, is_active)
            VALUES
                (1, 'System Admin', 'admin@hostel.com', '9876543210', '1990-01-01', TRUE);
        `);

        await pool.query(`
            INSERT INTO role (role_id, role_name, description, is_active)
            VALUES
                (1, 'SUPERADMIN', 'System Super Admin', TRUE),
                (2, 'HEAD', 'Organization Head', TRUE),
                (3, 'PARTNER', 'Business Partner', TRUE),
                (4, 'MANAGER', 'Hostel Manager', TRUE),
                (5, 'SUPERVISOR', 'Hostel Supervisor', TRUE);
        `);

        console.log("  ✅ Basic Admin logins and system roles created (admin@hostel.com / admin123)");
        console.log("✨ Database ready for clean manual testing!");
    } catch (error) {
        console.error("❌ Error resetting database:", error);
    } finally {
        process.exit(0);
    }
};

if (require.main === module) {
    resetDatabase();
}
