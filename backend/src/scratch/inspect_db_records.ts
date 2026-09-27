import pool from "../config/database";

async function inspectDatabase() {
    console.log("=== MYSQL DATABASE ROW COUNT SUMMARY ===");
    try {
        const tables = [
            "superadmin", "head", "partner", "manager", "supervisor", "person", "staff", "role", "role_assignment",
            "head_partner_assignment", "partner_manager_assignment", "partner_hostel_assignment",
            "manager_hostel_assignment", "hostel_supervisor_assignment", "hostel_staff",
            "hostel", "floor", "room", "bed", "facility", "hostel_facility",
            "tenant", "tenant_document", "emergency_contact", "tenant_preference", "tenant_stay", "tenant_allocation",
            "rent_structure", "rent", "payment", "receipt", "expense_category", "expense",
            "maintenance_target", "maintenance_complaint", "maintenance_request", "maintenance_update",
            "visitor", "visit", "visit_tenant"
        ];

        const results: { table: string; count: number }[] = [];
        for (const table of tables) {
            try {
                const [rows] = await pool.query<any[]>(`SELECT COUNT(*) as cnt FROM ${table}`);
                results.push({ table, count: rows[0].cnt });
            } catch (err: any) {
                results.push({ table, count: -1 });
            }
        }

        console.table(results);

        console.log("\n=== SAMPLING HIERARCHY TABLES ===");
        const hierarchyTables = ["head", "partner", "manager", "supervisor", "hostel", "head_partner_assignment", "partner_manager_assignment", "partner_hostel_assignment", "manager_hostel_assignment", "hostel_supervisor_assignment"];
        for (const hTable of hierarchyTables) {
            const [rows] = await pool.query<any[]>(`SELECT * FROM ${hTable}`);
            console.log(`--- ${hTable} (${rows.length}) ---`);
            console.log(JSON.stringify(rows, null, 2));
        }

        console.log("\n=== SAMPLING STAFF TABLE ===");
        const [staffRows] = await pool.query<any[]>(`SELECT staff_id, name, email, role, status FROM staff`);
        console.log(JSON.stringify(staffRows, null, 2));

    } catch (err) {
        console.error("Audit error:", err);
    } finally {
        await pool.end();
    }
}

inspectDatabase();
