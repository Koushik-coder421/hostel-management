import app from "../app";
import http from "http";
import pool from "../config/database";

const PORT = 5000;

const apiRequest = async (path: string, method: string = "GET", body?: any, token?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`http://localhost:${PORT}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await res.json();
    return { status: res.status, data };
};

const runPhase5Tests = async () => {
    console.log(`\n=================================================`);
    console.log(`🧪 Phase 5 Business Rules & Assignment Test Suite (Port ${PORT})`);
    console.log(`=================================================\n`);

    try {
        // 0. Wipe DB clean for fresh test execution
        await pool.query("SET FOREIGN_KEY_CHECKS = 0");
        const tables = [
            "visit_tenant", "visit", "visitor", "expense", "maintenance_update", "maintenance_request",
            "maintenance_complaint", "maintenance_target", "expense_category", "receipt", "payment", "rent",
            "rent_structure", "tenant_allocation", "tenant_stay", "tenant_preference", "emergency_contact",
            "tenant_document", "tenant", "hostel_facility", "facility", "bed", "room", "floor",
            "hostel_supervisor_assignment", "manager_hostel_assignment", "partner_hostel_assignment",
            "partner_manager_assignment", "head_partner_assignment", "hostel_staff", "hostel",
            "supervisor", "manager", "partner", "head", "role_assignment", "role", "superadmin", "person", "staff"
        ];
        for (const t of tables) await pool.query(`TRUNCATE TABLE ${t}`);
        await pool.query("SET FOREIGN_KEY_CHECKS = 1");

        // Seed Admin & System roles
        const bcrypt = require("bcryptjs");
        const adminPass = await bcrypt.hash("admin123", 10);
        await pool.query(`
            INSERT INTO staff (staff_id, name, email, password_hash, role, status)
            VALUES (1, 'System Admin', 'admin@hostel.com', ?, 'ADMIN', 'ACTIVE');
        `, [adminPass]);

        await pool.query(`
            INSERT INTO person (person_id, name, email, phone, is_active)
            VALUES (1, 'System Admin', 'admin@hostel.com', '9876543210', TRUE);
        `);

        // Login Admin
        const loginRes = await apiRequest("/api/auth/login", "POST", {
            email: "admin@hostel.com", password: "admin123"
        });
        const adminToken = loginRes.data.token;

        // Step 1: Create 2 Partners
        console.log("1. Creating 2 Partners (P1, P2)...");
        const p1 = await apiRequest("/api/hierarchy/partner", "POST", { name: "Partner One", email: "p1@hostel.com", password: "p1pass" }, adminToken);
        const p2 = await apiRequest("/api/hierarchy/partner", "POST", { name: "Partner Two", email: "p2@hostel.com", password: "p2pass" }, adminToken);
        const p1Id = p1.data.data.partner_id;
        const p2Id = p2.data.data.partner_id;
        console.log(`   P1 ID: ${p1Id}, P2 ID: ${p2Id}`);

        // Test A: Create 1 Hostel without partner -> least loaded (P1)
        console.log("\n[Test A] Creating 1 Hostel without partner (should auto-assign to P1)...");
        const h1 = await apiRequest("/api/hostels", "POST", { name: "Hostel Alpha", address: "123 Main St" }, adminToken);
        console.log("   Hostel Created. Assigned Partner ID:", h1.data.data?.assigned_partner_id);
        if (h1.data.data?.assigned_partner_id !== p1Id) throw new Error(`Expected P1 (${p1Id}), got ${h1.data.data?.assigned_partner_id}`);
        console.log("   ✅ Test A Passed!");

        // Test B: Create 5 more Hostels without partner -> 3 + 3 distribution overall
        console.log("\n[Test B] Creating 5 more Hostels without specifying partner (testing balanced distribution 3+3)...");
        for (let i = 2; i <= 6; i++) {
            await apiRequest("/api/hostels", "POST", { name: `Hostel #${i}`, address: `Street #${i}` }, adminToken);
        }

        const [p1Hostels] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE", [p1Id]);
        const [p2Hostels] = await pool.query<any[]>("SELECT COUNT(*) as cnt FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE", [p2Id]);
        console.log(`   P1 Hostels: ${p1Hostels[0].cnt}, P2 Hostels: ${p2Hostels[0].cnt}`);
        if (p1Hostels[0].cnt !== 3 || p2Hostels[0].cnt !== 3) throw new Error("Expected 3+3 distribution");
        console.log("   ✅ Test B Passed!");

        // Test C: Explicit Partner selected
        console.log("\n[Test C] Creating Hostel with explicit Partner P2...");
        const hExplicit = await apiRequest("/api/hostels", "POST", { name: "Hostel Explicit P2", address: "P2 Street", partner_id: p2Id }, adminToken);
        console.log("   Assigned Partner ID:", hExplicit.data.data?.assigned_partner_id);
        if (hExplicit.data.data?.assigned_partner_id !== p2Id) throw new Error("Expected P2");
        console.log("   ✅ Test C Passed!");

        // Step 2: Create Managers under P1 and P2
        console.log("\nCreating Manager M1 under P1, and Manager M2 under P2...");
        const m1 = await apiRequest("/api/hierarchy/manager", "POST", { name: "Manager M1", email: "m1@hostel.com", password: "m1pass", partner_id: p1Id }, adminToken);
        const m2 = await apiRequest("/api/hierarchy/manager", "POST", { name: "Manager M2", email: "m2@hostel.com", password: "m2pass", partner_id: p2Id }, adminToken);
        const m1Id = m1.data.data.manager_id;
        const m2Id = m2.data.data.manager_id;

        // Fetch a P1 hostel ID and P2 hostel ID
        const [p1HList] = await pool.query<any[]>("SELECT hostel_id FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE LIMIT 1", [p1Id]);
        const [p2HList] = await pool.query<any[]>("SELECT hostel_id FROM partner_hostel_assignment WHERE partner_id = ? AND is_current = TRUE LIMIT 1", [p2Id]);
        const p1HostelId = p1HList[0].hostel_id;
        const p2HostelId = p2HList[0].hostel_id;

        // Test D: Manager and Hostel under same Partner -> assignment succeeds
        console.log(`\n[Test D] Assigning M1 (P1) to Hostel ${p1HostelId} (P1)...`);
        const assignD = await apiRequest("/api/hierarchy/assign/manager-hostel", "POST", { manager_id: m1Id, hostel_id: p1HostelId }, adminToken);
        console.log("   Status Code:", assignD.status, "Message:", assignD.data.message);
        if (assignD.status !== 201) throw new Error("Expected 201");
        console.log("   ✅ Test D Passed!");

        // Test E: Manager and Hostel under different Partners -> assignment returns 400
        console.log(`\n[Test E] Attempting to assign M1 (P1) to Hostel ${p2HostelId} (P2) - SHOULD FAIL WITH 400...`);
        const assignE = await apiRequest("/api/hierarchy/assign/manager-hostel", "POST", { manager_id: m1Id, hostel_id: p2HostelId }, adminToken);
        console.log("   Status Code:", assignE.status, "Error Message:", assignE.data.message);
        if (assignE.status !== 400) throw new Error("Expected 400 Bad Request");
        console.log("   ✅ Test E Passed!");

        // Test F: Reassigning Manager on same Hostel leaves only new assignment current
        console.log(`\n[Test F] Creating M1_B under P1 and reassigning Hostel ${p1HostelId}...`);
        const m1B = await apiRequest("/api/hierarchy/manager", "POST", { name: "Manager M1_B", email: "m1b@hostel.com", password: "m1bpass", partner_id: p1Id }, adminToken);
        const m1BId = m1B.data.data.manager_id;
        await apiRequest("/api/hierarchy/assign/manager-hostel", "POST", { manager_id: m1BId, hostel_id: p1HostelId }, adminToken);
        const [currentMgrAssignments] = await pool.query<any[]>("SELECT * FROM manager_hostel_assignment WHERE hostel_id = ? AND is_current = TRUE", [p1HostelId]);
        console.log("   Active Manager Assignments Count:", currentMgrAssignments.length, "Active Manager ID:", currentMgrAssignments[0]?.manager_id);
        if (currentMgrAssignments.length !== 1 || currentMgrAssignments[0].manager_id !== m1BId) throw new Error("Expected single current assignment for M1_B");
        console.log("   ✅ Test F Passed!");

        // Step 3: Supervisors
        console.log("\nCreating Supervisors S1 and S2...");
        const s1 = await apiRequest("/api/hierarchy/supervisor", "POST", { name: "Supervisor S1", email: "s1@hostel.com", password: "s1pass", manager_id: m1Id }, adminToken);
        const s2 = await apiRequest("/api/hierarchy/supervisor", "POST", { name: "Supervisor S2", email: "s2@hostel.com", password: "s2pass", manager_id: m1Id }, adminToken);
        const s1Id = s1.data.data.supervisor_id;
        const s2Id = s2.data.data.supervisor_id;

        // Test G & H & I: Supervisor roles (TENANT_ADMIN vs MAINTENANCE)
        console.log(`\n[Test G, H, I] Testing Supervisor assignments (TENANT_ADMIN & MAINTENANCE)...`);
        await apiRequest("/api/hierarchy/assign/supervisor-hostel", "POST", { supervisor_id: s1Id, hostel_id: p1HostelId, assignment_role: "TENANT_ADMIN" }, adminToken);
        await apiRequest("/api/hierarchy/assign/supervisor-hostel", "POST", { supervisor_id: s2Id, hostel_id: p1HostelId, assignment_role: "MAINTENANCE" }, adminToken);

        const [supAssignments] = await pool.query<any[]>("SELECT * FROM hostel_supervisor_assignment WHERE hostel_id = ? AND is_current = TRUE", [p1HostelId]);
        console.log("   Active Supervisor Assignments Count:", supAssignments.length);
        console.log("   Roles:", supAssignments.map(s => `${s.assignment_role}: Supervisor #${s.supervisor_id}`).join(", "));
        if (supAssignments.length !== 2) throw new Error("Expected 2 active supervisors (1 TENANT_ADMIN + 1 MAINTENANCE)");
        console.log("   ✅ Test G, H, I Passed!");

        // Reset DB clean after tests complete
        await pool.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const t of tables) await pool.query(`TRUNCATE TABLE ${t}`);
        await pool.query("SET FOREIGN_KEY_CHECKS = 1");
        await pool.query(`
            INSERT INTO staff (staff_id, name, email, password_hash, role, status)
            VALUES (1, 'System Admin', 'admin@hostel.com', ?, 'ADMIN', 'ACTIVE');
        `, [adminPass]);
        await pool.query(`
            INSERT INTO person (person_id, name, email, phone, is_active)
            VALUES (1, 'System Admin', 'admin@hostel.com', '9876543210', TRUE);
        `);

        console.log(`\n=================================================`);
        console.log(`🎉 ALL PHASE 5 BUSINESS RULES VERIFIED SUCCESSFULLY!`);
        console.log(`=================================================\n`);
    } catch (err) {
        console.error("❌ Phase 5 Test Suite Error:", err);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

runPhase5Tests();
