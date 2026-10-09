import pool from "../config/database";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

export const seedDatabase = async () => {
    console.log("🌱 Starting Database Migration & Seeding...");

    try {
        // 0. Execute schema.sql to ensure all ER diagram tables exist
        const schemaPath = path.join(__dirname, "schema.sql");
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, "utf-8");
            const statements = schemaSql
                .split(";")
                .map(s => s.trim())
                .filter(s => s.length > 0);

            for (const stmt of statements) {
                try {
                    await pool.query(stmt);
                } catch (err: any) {
                    // Ignore table exists or statement errors during migration
                }
            }
            console.log("  ✅ Schema migration executed successfully");
        }

        // Migration helper: Add missing columns to existing tables safely
        const safeAddColumns = [
            "ALTER TABLE staff MODIFY COLUMN role VARCHAR(50) NOT NULL",
            "ALTER TABLE hostel ADD COLUMN hostel_code VARCHAR(50) NULL",
            "ALTER TABLE hostel ADD COLUMN reason VARCHAR(255) NULL",
            "ALTER TABLE room ADD COLUMN hostel_id INT NULL",
            "ALTER TABLE room ADD COLUMN sharing_type VARCHAR(20) NULL",
            "ALTER TABLE room ADD COLUMN reason VARCHAR(255) NULL",
            "ALTER TABLE bed ADD COLUMN bed_type VARCHAR(50) NULL",
            "ALTER TABLE bed ADD COLUMN reason VARCHAR(255) NULL",
            "ALTER TABLE bed ADD COLUMN remarks TEXT NULL",
            "ALTER TABLE tenant ADD COLUMN first_name VARCHAR(50) NULL",
            "ALTER TABLE tenant ADD COLUMN last_name VARCHAR(50) NULL",
            "ALTER TABLE tenant ADD COLUMN remarks TEXT NULL",
            "ALTER TABLE visit ADD COLUMN visit_date DATE NULL"
        ];

        for (const alterStmt of safeAddColumns) {
            try {
                await pool.query(alterStmt);
            } catch (err: any) {
                // Column already exists or duplicate column name error (code 1060)
            }
        }

        // 1. Create Staff Members
        const adminPass = await bcrypt.hash("admin123", 10);
        const superPass = await bcrypt.hash("super123", 10);
        const maintPass = await bcrypt.hash("maint123", 10);

        await pool.query(`
            INSERT INTO staff (name, email, password_hash, phone, role, status)
            VALUES
                ('System Admin', 'admin@hostel.com', ?, '9876543210', 'ADMIN', 'ACTIVE'),
                ('Hostel Supervisor', 'supervisor@hostel.com', ?, '9876543211', 'SUPERVISOR', 'ACTIVE'),
                ('Maintenance Staff', 'maint@hostel.com', ?, '9876543212', 'MAINTENANCE_STAFF', 'ACTIVE')
            ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash);
        `, [adminPass, superPass, maintPass]);

        console.log("  ✅ Staff seeded (Admin: admin@hostel.com / admin123)");

        // Fetch staff IDs
        const [staffs] = await pool.query<any[]>("SELECT staff_id, email, role FROM staff");
        const adminId = staffs.find(s => s.role === "ADMIN")?.staff_id || 1;
        const superId = staffs.find(s => s.role === "SUPERVISOR")?.staff_id || 2;
        const maintId = staffs.find(s => s.role === "MAINTENANCE_STAFF")?.staff_id || 3;

        // Seed Person & Roles
        await pool.query(`
            INSERT INTO person (person_id, name, email, phone, date_of_birth, is_active)
            VALUES
                (1, 'System Admin', 'admin@hostel.com', '9876543210', '1990-01-01', TRUE),
                (2, 'Hostel Supervisor', 'supervisor@hostel.com', '9876543211', '1992-03-15', TRUE),
                (3, 'Maintenance Staff', 'maint@hostel.com', '9876543212', '1995-07-20', TRUE)
            ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);

        await pool.query(`
            INSERT INTO role (role_id, role_name, description, is_active)
            VALUES
                (1, 'SUPERADMIN', 'System Super Admin', TRUE),
                (2, 'HEAD', 'Organization Head', TRUE),
                (3, 'PARTNER', 'Business Partner', TRUE),
                (4, 'MANAGER', 'Hostel Manager', TRUE),
                (5, 'SUPERVISOR', 'Hostel Supervisor', TRUE)
            ON DUPLICATE KEY UPDATE role_name=VALUES(role_name);
        `);

        await pool.query(`
            INSERT INTO expense_category (expense_category_id, category_name, description, status)
            VALUES
                (1, 'Plumbing & Water Supply', 'Plumbing repairs, pipe leaks, tap replacements, water pump maintenance', 'ACTIVE'),
                (2, 'Electrical & Wiring', 'Light fixtures, wiring repairs, switches, MCB breaker replacements', 'ACTIVE'),
                (3, 'HVAC & Air Conditioning', 'AC servicing, gas filling, exhaust fans', 'ACTIVE'),
                (4, 'Furniture & Carpentry', 'Bed frame repair, mattress replacement, desk/chair repair', 'ACTIVE'),
                (5, 'Cleaning & Sanitation', 'Housekeeping supplies, cleaning chemicals, pest control', 'ACTIVE'),
                (6, 'Internet & Networking', 'Wifi router replacement, broadband bills, cabling', 'ACTIVE'),
                (7, 'General Maintenance', 'Painting, civil repairs, door locks, hardware', 'ACTIVE'),
                (8, 'Utilities & Fuel', 'Water tanker supply, generator diesel, gas cylinders', 'ACTIVE')
            ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);
        `);

        // 2. Create Hostels
        await pool.query(`
            INSERT INTO hostel (hostel_id, hostel_code, name, address, contact_number, status)
            VALUES
                (1, 'HSTL-001', 'Grand Heights Hostel', '123 Tech Park Avenue, Block A', '040-23456789', 'ACTIVE'),
                (2, 'HSTL-002', 'Sunrise Residency', '456 University Road, Block B', '040-23456790', 'ACTIVE')
            ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);

        console.log("  ✅ Hostels seeded");

        // 3. Assign Staff to Hostel
        await pool.query(`
            INSERT INTO hostel_staff (hostel_id, staff_id, assigned_from)
            VALUES
                (1, ${superId}, '2026-01-01'),
                (1, ${maintId}, '2026-01-01')
            ON DUPLICATE KEY UPDATE assigned_from=VALUES(assigned_from);
        `);

        // 4. Create Floors
        await pool.query(`
            INSERT INTO floor (floor_id, hostel_id, floor_number, name)
            VALUES
                (1, 1, 1, 'First Floor'),
                (2, 1, 2, 'Second Floor'),
                (3, 2, 1, 'Ground Floor')
            ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);

        console.log("  ✅ Floors seeded");

        // 5. Create Rooms
        await pool.query(`
            INSERT INTO room (room_id, floor_id, hostel_id, room_number, room_type, sharing_type, capacity, status)
            VALUES
                (1, 1, 1, '101', 'Double Sharing AC', '2-SHARING', 2, 'AVAILABLE'),
                (2, 1, 1, '102', 'Double Sharing Non-AC', '2-SHARING', 2, 'AVAILABLE'),
                (3, 2, 1, '201', 'Single Sharing Deluxe', '1-SHARING', 1, 'AVAILABLE')
            ON DUPLICATE KEY UPDATE room_number=VALUES(room_number);
        `);

        console.log("  ✅ Rooms seeded");

        // 6. Create Beds
        await pool.query(`
            INSERT INTO bed (bed_id, room_id, bed_number, bed_type, status)
            VALUES
                (1, 1, '101-A', 'SINGLE_BED', 'AVAILABLE'),
                (2, 1, '101-B', 'SINGLE_BED', 'AVAILABLE'),
                (3, 2, '102-A', 'SINGLE_BED', 'AVAILABLE'),
                (4, 2, '102-B', 'SINGLE_BED', 'AVAILABLE'),
                (5, 3, '201-A', 'SINGLE_BED', 'AVAILABLE')
            ON DUPLICATE KEY UPDATE bed_number=VALUES(bed_number);
        `);

        console.log("  ✅ Beds seeded");

        // 7. Create Facilities
        await pool.query(`
            INSERT INTO facility (facility_id, hostel_id, name, description, status)
            VALUES
                (1, 1, 'High-Speed Wi-Fi', '500Mbps Fiber broadband across all floors', 'AVAILABLE'),
                (2, 1, 'Laundry Service', 'Washing machines and dryers available 24/7', 'AVAILABLE'),
                (3, 1, 'Fitness Gym', 'Basic cardio and weight training equipment', 'AVAILABLE')
            ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);

        console.log("  ✅ Facilities seeded");

        // 8. Create Rent Structure
        await pool.query(`
            INSERT INTO rent_structure (rent_structure_id, room_type, sharing_type, amount, effective_from, status)
            VALUES
                (1, 'Double Sharing AC', '2-SHARING', 8000.00, '2026-01-01', 'ACTIVE'),
                (2, 'Single Sharing Deluxe', '1-SHARING', 12000.00, '2026-01-01', 'ACTIVE')
            ON DUPLICATE KEY UPDATE amount=VALUES(amount);
        `);

        // 9. Create Tenants
        await pool.query(`
            INSERT INTO tenant (tenant_id, first_name, last_name, name, email, phone, gender, date_of_birth, address, emergency_contact_name, emergency_contact_phone, status)
            VALUES
                (1, 'Rahul', 'Sharma', 'Rahul Sharma', 'rahul.sharma@example.com', '9988776655', 'MALE', '2000-05-15', 'Flat 402, Green Valley Apartments', 'Suresh Sharma', '9988776600', 'ACTIVE'),
                (2, 'Ananya', 'Sen', 'Ananya Sen', 'ananya.sen@example.com', '9988776644', 'FEMALE', '2001-08-20', 'House 12, Park Street', 'Amit Sen', '9988776611', 'ACTIVE')
            ON DUPLICATE KEY UPDATE name=VALUES(name);
        `);

        console.log("  ✅ Tenants seeded");

        console.log("🎉 Database migration and seeding completed successfully!");
    } catch (error) {
        console.error("❌ Error during database seeding:", error);
    } finally {
        process.exit(0);
    }
};

if (require.main === module) {
    seedDatabase();
}
