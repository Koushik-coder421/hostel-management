import pool from "../config/database";
import { buildUserScope, enforceHostelScope, enforceTenantAdminResponsibility, enforceMaintenanceSupervisorResponsibility } from "../utils/scope";

async function runTests() {
    console.log("=========================================");
    console.log("STARTING INTEGRATION TESTS FOR PHASES 11-15");
    console.log("=========================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        } else {
            console.error(`[FAIL] ${testName}${detail ? " - " + detail : ""}`);
            failed++;
        }
    }

    try {
        // --- TEST GROUP 1: Expense Management (Phase 11) ---
        console.log("--- TEST GROUP 1: Expense Management ---");
        const categoryName = `Utilities_${Date.now()}`;
        const [catRes] = await pool.query<any>(
            `INSERT INTO expense_category (category_name, description, status) VALUES (?, 'Test Category', 'ACTIVE')`,
            [categoryName]
        );
        const categoryId = catRes.insertId;
        assert(categoryId > 0, "Expense category created successfully");

        const [catList] = await pool.query<any[]>("SELECT * FROM expense_category WHERE expense_category_id = ?", [categoryId]);
        assert(catList.length === 1 && catList[0].category_name === categoryName, "Expense category retrieved correctly");

        // Verify hostel exists to attach expense
        const [hostelRows] = await pool.query<any[]>("SELECT hostel_id FROM hostel LIMIT 1");
        let hostelId = 1;
        if (hostelRows.length > 0) {
            hostelId = hostelRows[0].hostel_id;
        } else {
            const [hRes] = await pool.query<any>(
                `INSERT INTO hostel (name, address, status) VALUES ('Test Hostel P11-15', '123 Main St', 'ACTIVE')`
            );
            hostelId = hRes.insertId;
        }

        const [expRes] = await pool.query<any>(
            `INSERT INTO expense (hostel_id, expense_category_id, amount, expense_date, description, recorded_by, status)
             VALUES (?, ?, 500.00, CURRENT_DATE, 'Electricity Bill', 1, 'APPROVED')`,
            [hostelId, categoryId]
        );
        const expenseId = expRes.insertId;
        assert(expenseId > 0, "Expense record created successfully");

        const [expRows] = await pool.query<any[]>("SELECT * FROM expense WHERE expense_id = ?", [expenseId]);
        assert(expRows.length === 1 && Number(expRows[0].amount) === 500, "Expense record retrieved correctly");

        // Expense summary query test
        const [expSummary] = await pool.query<any[]>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expense WHERE hostel_id = ? AND status != 'REJECTED'",
            [hostelId]
        );
        assert(Number(expSummary[0].total) >= 500, "Expense summary aggregated correctly");

        // Cleanup expense & category
        await pool.query("DELETE FROM expense WHERE expense_id = ?", [expenseId]);
        await pool.query("DELETE FROM expense_category WHERE expense_category_id = ?", [categoryId]);


        // --- TEST GROUP 2: Visitor Management (Phase 12) ---
        console.log("\n--- TEST GROUP 2: Visitor Management ---");
        const visitorPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
        const [visRes] = await pool.query<any>(
            `INSERT INTO visitor (name, phone, id_type, id_number) VALUES ('John Visitor', ?, 'Aadhar', '1234-5678')`,
            [visitorPhone]
        );
        const visitorId = visRes.insertId;
        assert(visitorId > 0, "Visitor registered successfully");

        const [visitRes] = await pool.query<any>(
            `INSERT INTO visit (visitor_id, hostel_id, purpose, check_in, status, verified_by)
             VALUES (?, ?, 'Parent Visit', CURRENT_TIMESTAMP, 'CHECKED_IN', 1)`,
            [visitorId, hostelId]
        );
        const visitId = visitRes.insertId;
        assert(visitId > 0, "Visit logged and checked in successfully");

        // Visitor checkout
        await pool.query("UPDATE visit SET status = 'CHECKED_OUT', check_out = CURRENT_TIMESTAMP WHERE visit_id = ?", [visitId]);
        const [checkedOutVisit] = await pool.query<any[]>("SELECT status FROM visit WHERE visit_id = ?", [visitId]);
        assert(checkedOutVisit[0].status === "CHECKED_OUT", "Visitor checked out successfully");

        // Cleanup visit & visitor
        await pool.query("DELETE FROM visit WHERE visit_id = ?", [visitId]);
        await pool.query("DELETE FROM visitor WHERE visitor_id = ?", [visitorId]);


        // --- TEST GROUP 3: Facilities & Hostel Configuration (Phase 13) ---
        console.log("\n--- TEST GROUP 3: Facilities & Hostel Configuration ---");
        const facilityName = `Gym_${Date.now()}`;
        const [facRes] = await pool.query<any>(
            `INSERT INTO facility (hostel_id, name, description, status) VALUES (?, ?, 'Fitness Gym', 'AVAILABLE')`,
            [hostelId, facilityName]
        );
        const facilityId = facRes.insertId;
        assert(facilityId > 0, "Global facility created successfully");

        const [hfRes] = await pool.query<any>(
            `INSERT INTO hostel_facility (hostel_id, facility_id, name, location, status)
             VALUES (?, ?, ?, 'Ground Floor', 'AVAILABLE')`,
            [hostelId, facilityId, facilityName]
        );
        const hfId = hfRes.insertId;
        assert(hfId > 0, "Facility assigned to hostel successfully");

        const [hfRows] = await pool.query<any[]>("SELECT * FROM hostel_facility WHERE hostel_facility_id = ?", [hfId]);
        assert(hfRows.length === 1 && hfRows[0].location === "Ground Floor", "Hostel facility assignment retrieved correctly");

        // Deactivate assignment
        await pool.query("UPDATE hostel_facility SET status = 'UNAVAILABLE' WHERE hostel_facility_id = ?", [hfId]);
        const [updatedHf] = await pool.query<any[]>("SELECT status FROM hostel_facility WHERE hostel_facility_id = ?", [hfId]);
        assert(updatedHf[0].status === "UNAVAILABLE", "Hostel facility assignment deactivated safely");

        // Cleanup hostel facility & global facility
        await pool.query("DELETE FROM hostel_facility WHERE hostel_facility_id = ?", [hfId]);
        await pool.query("DELETE FROM facility WHERE facility_id = ?", [facilityId]);


        // --- TEST GROUP 4: Scoped Reports & Dashboard Data (Phase 14) ---
        console.log("\n--- TEST GROUP 4: Scoped Reports & Dashboard Data ---");
        const adminScope = await buildUserScope({ staff_id: 1, email: "admin@hostel.com", role: "ADMIN" });
        assert(adminScope.role === "ADMIN", "Admin scope built for reporting");

        const scopedManagerScope = {
            userId: "99",
            role: "MANAGER",
            responsibility: null,
            organizationId: "1",
            allowedHostelIds: [String(hostelId)],
            activeHostelId: String(hostelId)
        };

        let scopePass = false;
        try {
            await enforceHostelScope(scopedManagerScope, hostelId);
            scopePass = true;
        } catch (e) {
            scopePass = false;
        }
        assert(scopePass, "Allowed hostel scope check passed for manager");

        let scopeFail = false;
        try {
            await enforceHostelScope(scopedManagerScope, 99999);
        } catch (e: any) {
            scopeFail = true;
        }
        assert(scopeFail, "Unauthorized hostel scope access blocked (HTTP 403 throwing)");


        // --- TEST GROUP 5: Role Security & Supervisor Responsibility (Phase 15) ---
        console.log("\n--- TEST GROUP 5: Role Security & Supervisor Responsibility ---");
        const tenantAdminScope = {
            userId: "100",
            role: "SUPERVISOR",
            responsibility: "TENANT_ADMIN",
            organizationId: "1",
            allowedHostelIds: [String(hostelId)],
            activeHostelId: String(hostelId)
        };

        const maintScope = {
            userId: "101",
            role: "SUPERVISOR",
            responsibility: "MAINTENANCE",
            organizationId: "1",
            allowedHostelIds: [String(hostelId)],
            activeHostelId: String(hostelId)
        };

        let maintBlock = false;
        try {
            enforceTenantAdminResponsibility(maintScope);
        } catch (e: any) {
            maintBlock = true;
        }
        assert(maintBlock, "Maintenance supervisor prevented from performing TENANT_ADMIN actions");

        let tenantAdminBlock = false;
        try {
            enforceMaintenanceSupervisorResponsibility(tenantAdminScope);
        } catch (e: any) {
            tenantAdminBlock = true;
        }
        assert(tenantAdminBlock, "Tenant Admin supervisor prevented from performing MAINTENANCE actions");


        console.log("\n=========================================");
        console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log("=========================================");

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

runTests();
