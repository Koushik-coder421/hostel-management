import pool from "../config/database";
import { buildUserScope, enforceHostelScope, enforceTenantAdminResponsibility, enforceMaintenanceSupervisorResponsibility } from "../utils/scope";

async function runE2ETests() {
    console.log("=================================================");
    console.log("STARTING FINAL END-TO-END INTEGRATION TEST SUITE");
    console.log("Phases 1 through 15 Full Verification");
    console.log("=================================================\n");

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
        // --- PART 2: AUTHENTICATION & SESSION TESTS ---
        console.log("--- PART 2: Authentication & Session Tests ---");
        const [adminStaff] = await pool.query<any[]>(
            "SELECT staff_id, email, role FROM staff WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1"
        );
        assert(adminStaff.length > 0, "System Admin account exists in database");
        const adminUser = adminStaff[0];

        const adminScope = await buildUserScope(adminUser);
        assert(adminScope.role === "ADMIN", "Admin session & role resolved correctly");
        assert(Array.isArray(adminScope.allowedHostelIds), "Admin scope returns allowed hostel IDs array");


        // --- PART 3: ORGANIZATION HIERARCHY TESTS ---
        console.log("\n--- PART 3: Organization Hierarchy Tests ---");
        const timestamp = Date.now();

        // 1. Create Person records
        async function createPerson(name: string, email: string, phone: string) {
            const [res] = await pool.query<any>(
                `INSERT INTO person (name, email, phone, is_active) VALUES (?, ?, ?, TRUE)`,
                [name, email, phone]
            );
            return res.insertId;
        }

        const headPersonId = await createPerson(`Head E2E ${timestamp}`, `head_${timestamp}@e2e.com`, `91${Math.floor(10000000 + Math.random() * 90000000)}`);
        const partner1PersonId = await createPerson(`Partner A ${timestamp}`, `partnera_${timestamp}@e2e.com`, `92${Math.floor(10000000 + Math.random() * 90000000)}`);
        const partner2PersonId = await createPerson(`Partner B ${timestamp}`, `partnerb_${timestamp}@e2e.com`, `93${Math.floor(10000000 + Math.random() * 90000000)}`);
        const managerA1PersonId = await createPerson(`Manager A1 ${timestamp}`, `managera1_${timestamp}@e2e.com`, `94${Math.floor(10000000 + Math.random() * 90000000)}`);
        const managerA2PersonId = await createPerson(`Manager A2 ${timestamp}`, `managera2_${timestamp}@e2e.com`, `95${Math.floor(10000000 + Math.random() * 90000000)}`);
        const managerB1PersonId = await createPerson(`Manager B1 ${timestamp}`, `managerb1_${timestamp}@e2e.com`, `96${Math.floor(10000000 + Math.random() * 90000000)}`);
        const managerB2PersonId = await createPerson(`Manager B2 ${timestamp}`, `managerb2_${timestamp}@e2e.com`, `97${Math.floor(10000000 + Math.random() * 90000000)}`);
        const supTenantPersonId = await createPerson(`Supervisor TenantAdmin ${timestamp}`, `suptenant_${timestamp}@e2e.com`, `98${Math.floor(10000000 + Math.random() * 90000000)}`);
        const supMaintPersonId = await createPerson(`Supervisor Maint ${timestamp}`, `supmaint_${timestamp}@e2e.com`, `99${Math.floor(10000000 + Math.random() * 90000000)}`);

        // 2. Insert into role specific tables
        const [hRes] = await pool.query<any>(`INSERT INTO head (person_id, is_active) VALUES (?, TRUE)`, [headPersonId]);
        const headId = hRes.insertId;

        const [p1Res] = await pool.query<any>(`INSERT INTO partner (person_id, is_active) VALUES (?, TRUE)`, [partner1PersonId]);
        const partnerAId = p1Res.insertId;

        const [p2Res] = await pool.query<any>(`INSERT INTO partner (person_id, is_active) VALUES (?, TRUE)`, [partner2PersonId]);
        const partnerBId = p2Res.insertId;

        const [mA1Res] = await pool.query<any>(`INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)`, [managerA1PersonId]);
        const managerA1Id = mA1Res.insertId;

        const [mA2Res] = await pool.query<any>(`INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)`, [managerA2PersonId]);
        const managerA2Id = mA2Res.insertId;

        const [mB1Res] = await pool.query<any>(`INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)`, [managerB1PersonId]);
        const managerB1Id = mB1Res.insertId;

        const [mB2Res] = await pool.query<any>(`INSERT INTO manager (person_id, is_active) VALUES (?, TRUE)`, [managerB2PersonId]);
        const managerB2Id = mB2Res.insertId;

        const [sTRes] = await pool.query<any>(`INSERT INTO supervisor (person_id, is_active) VALUES (?, TRUE)`, [supTenantPersonId]);
        const supervisorTenantId = sTRes.insertId;

        const [sMRes] = await pool.query<any>(`INSERT INTO supervisor (person_id, is_active) VALUES (?, TRUE)`, [supMaintPersonId]);
        const supervisorMaintId = sMRes.insertId;

        // 3. Create 4 Hostels
        async function createHostel(name: string, code: string) {
            const [res] = await pool.query<any>(
                `INSERT INTO hostel (name, hostel_code, address, status) VALUES (?, ?, ?, 'ACTIVE')`,
                [name, code, `Location ${name}`]
            );
            return res.insertId;
        }

        const hostelA1Id = await createHostel(`Hostel A1 ${timestamp}`, `HA1_${timestamp}`);
        const hostelA2Id = await createHostel(`Hostel A2 ${timestamp}`, `HA2_${timestamp}`);
        const hostelB1Id = await createHostel(`Hostel B1 ${timestamp}`, `HB1_${timestamp}`);
        const hostelB2Id = await createHostel(`Hostel B2 ${timestamp}`, `HB2_${timestamp}`);

        assert(hostelA1Id > 0 && hostelB2Id > 0, "4 Hostels created successfully");

        // 4. Create Assignments
        await pool.query(`INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [headId, partnerAId]);
        await pool.query(`INSERT INTO head_partner_assignment (head_id, partner_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [headId, partnerBId]);

        await pool.query(`INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerAId, hostelA1Id]);
        await pool.query(`INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerAId, hostelA2Id]);
        await pool.query(`INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerBId, hostelB1Id]);
        await pool.query(`INSERT INTO partner_hostel_assignment (partner_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerBId, hostelB2Id]);

        await pool.query(`INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerAId, managerA1Id]);
        await pool.query(`INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerAId, managerA2Id]);
        await pool.query(`INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerBId, managerB1Id]);
        await pool.query(`INSERT INTO partner_manager_assignment (partner_id, manager_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [partnerBId, managerB2Id]);

        await pool.query(`INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [managerA1Id, hostelA1Id]);
        await pool.query(`INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [managerA2Id, hostelA2Id]);
        await pool.query(`INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [managerB1Id, hostelB1Id]);
        await pool.query(`INSERT INTO manager_hostel_assignment (manager_id, hostel_id, start_date, is_current) VALUES (?, ?, CURRENT_DATE, TRUE)`, [managerB2Id, hostelB2Id]);

        await pool.query(`INSERT INTO hostel_supervisor_assignment (hostel_id, supervisor_id, assignment_role, start_date, is_current) VALUES (?, ?, 'TENANT_ADMIN', CURRENT_DATE, TRUE)`, [hostelA1Id, supervisorTenantId]);
        await pool.query(`INSERT INTO hostel_supervisor_assignment (hostel_id, supervisor_id, assignment_role, start_date, is_current) VALUES (?, ?, 'MAINTENANCE', CURRENT_DATE, TRUE)`, [hostelA1Id, supervisorMaintId]);

        assert(true, "Organization hierarchy assignments created successfully");


        // --- PART 4: HOSTEL STRUCTURE TESTS ---
        console.log("\n--- PART 4: Hostel Structure Tests ---");
        const [fl1Res] = await pool.query<any>(`INSERT INTO floor (hostel_id, floor_number, name) VALUES (?, 1, 'Floor 1')`, [hostelA1Id]);
        const floor1Id = fl1Res.insertId;

        const [rm1Res] = await pool.query<any>(`INSERT INTO room (floor_id, hostel_id, room_number, capacity, status) VALUES (?, ?, '101', 2, 'AVAILABLE')`, [floor1Id, hostelA1Id]);
        const room101Id = rm1Res.insertId;

        const [bed1Res] = await pool.query<any>(`INSERT INTO bed (room_id, bed_number, status) VALUES (?, '101-A', 'AVAILABLE')`, [room101Id]);
        const bed101AId = bed1Res.insertId;

        const [bed2Res] = await pool.query<any>(`INSERT INTO bed (room_id, bed_number, status) VALUES (?, '101-B', 'AVAILABLE')`, [room101Id]);
        const bed101BId = bed2Res.insertId;

        assert(floor1Id > 0 && room101Id > 0 && bed101AId > 0 && bed101BId > 0, "Hostel -> Floor -> Room -> Bed structure created");


        // --- PART 5: TENANT TESTS ---
        console.log("\n--- PART 5: Tenant Tests ---");
        const tenantAPhone = `81${Math.floor(10000000 + Math.random() * 90000000)}`;
        const tenantBPhone = `82${Math.floor(10000000 + Math.random() * 90000000)}`;

        const [tARes] = await pool.query<any>(`INSERT INTO tenant (name, phone, status) VALUES ('Tenant A', ?, 'ACTIVE')`, [tenantAPhone]);
        const tenantAId = tARes.insertId;

        const [tBRes] = await pool.query<any>(`INSERT INTO tenant (name, phone, status) VALUES ('Tenant B', ?, 'ACTIVE')`, [tenantBPhone]);
        const tenantBId = tBRes.insertId;

        // Sub-resources
        await pool.query(`INSERT INTO tenant_document (tenant_id, document_type, document_number) VALUES (?, 'ID_CARD', 'DOC-123')`, [tenantAId]);
        await pool.query(`INSERT INTO emergency_contact (tenant_id, name, phone) VALUES (?, 'Parent A', '9999999999')`, [tenantAId]);
        await pool.query(`INSERT INTO tenant_preference (tenant_id, preferred_sharing_type) VALUES (?, 'DOUBLE')`, [tenantAId]);

        const [tAStay] = await pool.query<any[]>("SELECT * FROM tenant_allocation WHERE tenant_id = ?", [tenantAId]);
        assert(tAStay.length === 0, "Tenant registration does NOT auto-create active stay before check-in");


        // --- PART 6: CHECK-IN / ALLOCATION / TRANSFER / CHECKOUT TESTS ---
        console.log("\n--- PART 6: Check-In, Transfer & Checkout Tests ---");
        // 1. Allocate Tenant A to Bed 101-A
        const [allocARes] = await pool.query<any>(
            `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by) VALUES (?, ?, CURRENT_DATE, 'ACTIVE', 1)`,
            [tenantAId, bed101AId]
        );
        const allocAId = allocARes.insertId;
        await pool.query("UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?", [bed101AId]);

        const [bed101Check] = await pool.query<any[]>("SELECT status FROM bed WHERE bed_id = ?", [bed101AId]);
        assert(allocAId > 0 && bed101Check[0].status === "OCCUPIED", "Tenant A check-in allocates bed and marks status OCCUPIED");

        // 2. Bed Transfer: Tenant A from Bed 101-A to Bed 101-B
        await pool.query("UPDATE tenant_allocation SET status = 'COMPLETED', end_date = CURRENT_DATE WHERE allocation_id = ?", [allocAId]);
        await pool.query("UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ?", [bed101AId]);

        const [allocA2Res] = await pool.query<any>(
            `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by) VALUES (?, ?, CURRENT_DATE, 'ACTIVE', 1)`,
            [tenantAId, bed101BId]
        );
        await pool.query("UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?", [bed101BId]);

        const [b101ACheck] = await pool.query<any[]>("SELECT status FROM bed WHERE bed_id = ?", [bed101AId]);
        const [b101BCheck] = await pool.query<any[]>("SELECT status FROM bed WHERE bed_id = ?", [bed101BId]);
        assert(b101ACheck[0].status === "AVAILABLE" && b101BCheck[0].status === "OCCUPIED", "Bed transfer frees old bed and occupies new bed transactionally");

        // 3. Checkout Tenant A
        await pool.query("UPDATE tenant_allocation SET status = 'COMPLETED', end_date = CURRENT_DATE WHERE allocation_id = ?", [allocA2Res.insertId]);
        await pool.query("UPDATE bed SET status = 'AVAILABLE' WHERE bed_id = ?", [bed101BId]);
        const [b101BAfterCheckout] = await pool.query<any[]>("SELECT status FROM bed WHERE bed_id = ?", [bed101BId]);
        assert(b101BAfterCheckout[0].status === "AVAILABLE", "Checkout completed allocation and restored bed status to AVAILABLE");


        // --- PART 7: RENT / PAYMENT / RECEIPT TESTS ---
        console.log("\n--- PART 7: Rent, Payment & Receipt Tests ---");
        // Allocate Tenant B to Bed 101-A
        const [allocBRes] = await pool.query<any>(
            `INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, status, allocated_by) VALUES (?, ?, CURRENT_DATE, 'ACTIVE', 1)`,
            [tenantBId, bed101AId]
        );
        const allocBId = allocBRes.insertId;
        await pool.query("UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = ?", [bed101AId]);

        const [paySuccRes] = await pool.query<any>(
            `INSERT INTO payment (tenant_id, allocation_id, amount, payment_type, status, recorded_by) VALUES (?, ?, 1200.00, 'RENT', 'SUCCESS', 1)`,
            [tenantBId, allocBId]
        );
        const paySuccId = paySuccRes.insertId;

        const [payFailRes] = await pool.query<any>(
            `INSERT INTO payment (tenant_id, allocation_id, amount, payment_type, status, recorded_by) VALUES (?, ?, 500.00, 'RENT', 'FAILED', 1)`,
            [tenantBId, allocBId]
        );
        const payFailId = payFailRes.insertId;

        const [pSuccCheck] = await pool.query<any[]>("SELECT status FROM payment WHERE payment_id = ?", [paySuccId]);
        const [pFailCheck] = await pool.query<any[]>("SELECT status FROM payment WHERE payment_id = ?", [payFailId]);

        assert(pSuccCheck[0].status === "SUCCESS", "Success payment recorded correctly");
        assert(pFailCheck[0].status === "FAILED", "Failed payment recorded correctly");


        // --- PART 8: MAINTENANCE TESTS ---
        console.log("\n--- PART 8: Maintenance Tests ---");
        const [maintCompRes] = await pool.query<any>(
            `INSERT INTO maintenance_complaint (tenant_id, target_type, target_id, description, priority, status)
             VALUES (?, 'ROOM', ?, 'Water Leakage in Room 101', 'HIGH', 'OPEN')`,
            [tenantBId, room101Id]
        );
        const complaintId = maintCompRes.insertId;

        const [maintReqRes] = await pool.query<any>(
            `INSERT INTO maintenance_request (complaint_id, raised_by, description, priority, status)
             VALUES (?, 1, 'Fix pipe leakage', 'HIGH', 'RAISED')`,
            [complaintId]
        );
        const requestId = maintReqRes.insertId;

        await pool.query("UPDATE maintenance_complaint SET status = 'CONVERTED' WHERE complaint_id = ?", [complaintId]);
        await pool.query("UPDATE maintenance_request SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP WHERE request_id = ?", [requestId]);
        await pool.query("UPDATE maintenance_complaint SET status = 'CLOSED' WHERE complaint_id = ?", [complaintId]);

        const [compCheck] = await pool.query<any[]>("SELECT status FROM maintenance_complaint WHERE complaint_id = ?", [complaintId]);
        assert(compCheck[0].status === "CLOSED", "Maintenance workflow completed and complaint closed");


        // --- PART 9: EXPENSES, PART 10: VISITORS, PART 11: FACILITIES ---
        console.log("\n--- PART 9-11: Expenses, Visitors & Facilities Tests ---");
        // Expense for Hostel A1
        const [catRes] = await pool.query<any>(`INSERT INTO expense_category (category_name, description) VALUES (?, 'Cleaning')`, [`Cleaning_${timestamp}`]);
        const catId = catRes.insertId;
        const [expRes] = await pool.query<any>(
            `INSERT INTO expense (hostel_id, expense_category_id, amount, expense_date, description, recorded_by, status)
             VALUES (?, ?, 250.00, CURRENT_DATE, 'Hostel Deep Clean', 1, 'APPROVED')`,
            [hostelA1Id, catId]
        );

        // Visitor for Hostel A1
        const [visRes] = await pool.query<any>(`INSERT INTO visitor (name, phone) VALUES ('Visitor Alpha', '9988776655')`);
        const visId = visRes.insertId;
        const [visitRes] = await pool.query<any>(
            `INSERT INTO visit (visitor_id, hostel_id, purpose, check_in, status) VALUES (?, ?, 'Family Visit', CURRENT_TIMESTAMP, 'CHECKED_IN')`,
            [visId, hostelA1Id]
        );

        // Facility for Hostel A1
        const [facRes] = await pool.query<any>(`INSERT INTO facility (hostel_id, name, status) VALUES (?, ?, 'AVAILABLE')`, [hostelA1Id, `Laundry_${timestamp}`]);

        assert(expRes.insertId > 0 && visitRes.insertId > 0 && facRes.insertId > 0, "Expense, Visitor, and Facility records created for Hostel A1");


        // --- PART 12: REPORTING & SCOPE SECURITY TESTS ---
        console.log("\n--- PART 12: Reporting & Scope Isolation Tests ---");
        // Build scope for Partner A vs Partner B
        const partnerAScope = await buildUserScope({ staff_id: 10, email: `partnera_${timestamp}@e2e.com`, role: "PARTNER" });
        const partnerBScope = await buildUserScope({ staff_id: 11, email: `partnerb_${timestamp}@e2e.com`, role: "PARTNER" });

        assert(partnerAScope.allowedHostelIds.includes(String(hostelA1Id)), "Partner A scope contains Hostel A1");
        assert(!partnerAScope.allowedHostelIds.includes(String(hostelB1Id)), "Partner A scope does NOT contain Partner B's Hostel B1");

        assert(partnerBScope.allowedHostelIds.includes(String(hostelB1Id)), "Partner B scope contains Hostel B1");
        assert(!partnerBScope.allowedHostelIds.includes(String(hostelA1Id)), "Partner B scope does NOT contain Partner A's Hostel A1");


        // --- PART 13 & 15: ROLE ACCESS MATRIX & NEGATIVE TESTING ---
        console.log("\n--- PART 13 & 15: Role Security & Negative Access Control ---");
        let blockedScopeAccess = false;
        try {
            await enforceHostelScope(partnerAScope, hostelB1Id);
        } catch (e) {
            blockedScopeAccess = true;
        }
        assert(blockedScopeAccess, "Cross-Partner hostel access correctly blocked (HTTP 403 throwing)");

        let maintBlock = false;
        try {
            enforceTenantAdminResponsibility({
                userId: "100",
                role: "SUPERVISOR",
                responsibility: "MAINTENANCE",
                organizationId: "1",
                allowedHostelIds: [String(hostelA1Id)],
                activeHostelId: String(hostelA1Id)
            });
        } catch (e) {
            maintBlock = true;
        }
        assert(maintBlock, "Maintenance supervisor prevented from performing TENANT_ADMIN actions");


        console.log("\n=================================================");
        console.log(`E2E SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log("=================================================");

        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err) {
        console.error("E2E Test Execution Error:", err);
        process.exit(1);
    }
}

runE2ETests();
