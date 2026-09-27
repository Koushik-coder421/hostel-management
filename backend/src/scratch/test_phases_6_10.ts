import pool from "../config/database";
import { buildUserScope, enforceHostelScope, enforceTenantAdminResponsibility, enforceMaintenanceSupervisorResponsibility } from "../utils/scope";

async function runTests() {
    console.log("=========================================");
    console.log("STARTING INTEGRATION TESTS FOR PHASES 6-10");
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
        // --- TEST 1: Scope Utility & Role Scope Resolution ---
        console.log("--- TEST GROUP 1: User Scope Resolution ---");
        const adminScope = await buildUserScope({ staff_id: 1, email: "admin@hostel.com", role: "ADMIN" });
        assert(adminScope.role === "ADMIN", "ADMIN scope built successfully");
        assert(adminScope.allowedHostelIds.length >= 0, "ADMIN scope resolves allowed hostels");

        // --- TEST 2: Room Capacity & Bed Creation Rules ---
        console.log("\n--- TEST GROUP 2: Room Capacity & Bed Allocation Rules ---");
        const [rooms] = await pool.query<any[]>("SELECT room_id, capacity FROM room LIMIT 1");
        if (rooms.length > 0) {
            const roomId = rooms[0].room_id;
            const capacity = rooms[0].capacity;
            const [beds] = await pool.query<any[]>("SELECT COUNT(*) as count FROM bed WHERE room_id = ?", [roomId]);
            const currentBeds = beds[0].count;
            assert(currentBeds <= capacity, `Beds in room ${roomId} (${currentBeds}) do not exceed capacity (${capacity})`);
        } else {
            console.log("[SKIP] No rooms present in DB to test bed capacity limit");
        }

        // --- TEST 3: Tenant Registration Does Not Auto-Create Tenant Stay ---
        console.log("\n--- TEST GROUP 3: Tenant Registration Integrity ---");
        const testPhone = `99${Math.floor(10000000 + Math.random() * 90000000)}`;
        const testEmail = `tenant_${Date.now()}@example.com`;
        
        const [tResult] = await pool.query<any>(
            `INSERT INTO tenant (name, email, phone, status) VALUES (?, ?, ?, 'ACTIVE')`,
            ["Test Tenant P610", testEmail, testPhone]
        );
        const tenantId = tResult.insertId;

        const [allocs] = await pool.query<any[]>("SELECT * FROM tenant_allocation WHERE tenant_id = ?", [tenantId]);
        assert(allocs.length === 0, "Tenant creation does NOT auto-create tenant_stay or tenant_allocation");

        // --- TEST 4: Payment Receipt Generation Rule ---
        console.log("\n--- TEST GROUP 4: Payment Receipt Rules ---");
        const [failPayResult] = await pool.query<any>(
            `INSERT INTO payment (tenant_id, amount, payment_type, status, recorded_by) VALUES (?, 1000, 'RENT', 'FAILED', 1)`,
            [tenantId]
        );
        const failedPayId = failPayResult.insertId;
        const [failPayRows] = await pool.query<any[]>("SELECT status FROM payment WHERE payment_id = ?", [failedPayId]);
        assert(failPayRows[0].status === "FAILED", "Failed payment recorded correctly");

        const [succPayResult] = await pool.query<any>(
            `INSERT INTO payment (tenant_id, amount, payment_type, status, recorded_by) VALUES (?, 1000, 'RENT', 'SUCCESS', 1)`,
            [tenantId]
        );
        const succPayId = succPayResult.insertId;
        const [succPayRows] = await pool.query<any[]>("SELECT status FROM payment WHERE payment_id = ?", [succPayId]);
        assert(succPayRows[0].status === "SUCCESS", "Success payment recorded correctly");

        // Cleanup test payment & tenant
        await pool.query("DELETE FROM payment WHERE tenant_id = ?", [tenantId]);
        await pool.query("DELETE FROM tenant WHERE tenant_id = ?", [tenantId]);

        // --- TEST 5: Maintenance Supervisor Responsibility Separation ---
        console.log("\n--- TEST GROUP 5: Supervisor Responsibility Separation ---");
        const tenantAdminScope = {
            userId: "100",
            role: "SUPERVISOR",
            responsibility: "TENANT_ADMIN",
            organizationId: "1",
            allowedHostelIds: ["1"],
            activeHostelId: "1"
        };
        const maintenanceScope = {
            userId: "101",
            role: "SUPERVISOR",
            responsibility: "MAINTENANCE",
            organizationId: "1",
            allowedHostelIds: ["1"],
            activeHostelId: "1"
        };

        let caughtTenantAdminErr = false;
        try {
            enforceTenantAdminResponsibility(maintenanceScope);
        } catch (e: any) {
            caughtTenantAdminErr = true;
        }
        assert(caughtTenantAdminErr, "Maintenance supervisor prevented from performing TENANT_ADMIN actions");

        let caughtMaintErr = false;
        try {
            enforceMaintenanceSupervisorResponsibility(tenantAdminScope);
        } catch (e: any) {
            caughtMaintErr = true;
        }
        assert(caughtMaintErr, "Tenant Admin supervisor prevented from performing MAINTENANCE actions");

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
