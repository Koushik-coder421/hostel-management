import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add headers, footers, and page numbers 'Page X of Y'.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "HOSTEL MANAGEMENT SYSTEM — ENTERPRISE ARCHITECTURE & API EXECUTABLE GUIDE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 30, page_text)
        self.drawString(54, 30, "CONFIDENTIAL — FOR SENIOR EVALUATION & SYSTEM ARCHITECTURE PRESENTATION")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Colors
    PRIMARY = colors.HexColor("#0F172A")    # Dark Slate
    SECONDARY = colors.HexColor("#0284C7")  # Sapphire Blue
    ACCENT = colors.HexColor("#0F766E")     # Teal accent
    TEXT_DARK = colors.HexColor("#1E293B")  # Off-black body
    BG_LIGHT = colors.HexColor("#F8FAFC")   # Light slate bg
    BORDER_COLOR = colors.HexColor("#CBD5E1")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        alignment=0,
        spaceAfter=8
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
        borderWidth=0.5,
        borderPadding=5,
        spaceBefore=4,
        spaceAfter=6,
        borderRadius=4
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=body_style,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E3A8A"),
        backColor=colors.HexColor("#EFF6FF"),
        borderColor=colors.HexColor("#BFDBFE"),
        borderWidth=0.8,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8,
        borderRadius=4
    )

    qa_question_style = ParagraphStyle(
        'QAQuestion',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=2,
        keepWithNext=True
    )

    qa_answer_style = ParagraphStyle(
        'QAAnswer',
        parent=body_style,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        backColor=colors.HexColor("#F8FAFC"),
        borderColor=colors.HexColor("#E2E8F0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=6
    )

    story = []

    # Title Banner
    story.append(Paragraph("HOSTEL MANAGEMENT SYSTEM", subtitle_style))
    story.append(Paragraph("100-Hostel Enterprise Architecture, Executable API Examples & Senior Presentation Guide", title_style))
    story.append(Paragraph("<b>Presenter:</b> Core System Engineering Team | <b>Scale:</b> 100 Hostels, 1 Head, 5 Partners, 20 Managers, 200 Supervisors, 1 Super Admin", body_style))
    story.append(HRFlowable(width="100%", thickness=2, color=SECONDARY, spaceBefore=4, spaceAfter=12))

    story.append(Paragraph(
        "<b>Executive Summary:</b> Complete executable guide for senior evaluation. Contains mathematical proofs, "
        "Closure Table hierarchy patterns, step-by-step cURL commands, HTTP request payloads, response JSONs, SQL queries executed under the hood, and technical Q&A.",
        callout_style
    ))

    # PART 1: SCALE & MATH BREAKDOWN
    story.append(Paragraph("Part 1: Organizational Hierarchy & Scale Blueprint (100 Hostels)", h1_style))
    story.append(Paragraph(
        "The system operates on a 6-level role hierarchy designed for clear operational accountability, delegation, and strict data isolation.",
        body_style
    ))

    math_data = [
        [Paragraph("<b>Role Level</b>", body_style), Paragraph("<b>Count</b>", body_style), Paragraph("<b>Ownership Ratio</b>", body_style), Paragraph("<b>Primary Focus & Visibility Scope</b>", body_style)],
        [Paragraph("<b>Super Admin</b>", body_style), Paragraph("1 (System)", body_style), Paragraph("Global System Infrastructure", body_style), Paragraph("Platform Config, Head/Partner History Logs, System Audits", body_style)],
        [Paragraph("<b>Head</b>", body_style), Paragraph("1 Enterprise Head", body_style), Paragraph("Oversees all 5 Partners / 100 Hostels", body_style), Paragraph("Cross-partner consolidated analytics & strategic expansion", body_style)],
        [Paragraph("<b>Partner</b>", body_style), Paragraph("5 Partners", body_style), Paragraph("20 Hostels per Partner (5 × 20 = 100)", body_style), Paragraph("Partner portfolio P&L, manager performance, revenue metrics", body_style)],
        [Paragraph("<b>Manager</b>", body_style), Paragraph("20 Managers", body_style), Paragraph("4 Managers / Partner (5 Hostels / Manager)", body_style), Paragraph("Daily operational reports, supervisor task tracking, 5-hostel stats", body_style)],
        [Paragraph("<b>Supervisor 1</b>", body_style), Paragraph("100 Supervisors", body_style), Paragraph("1 per Hostel (Payment & Visitor Desk)", body_style), Paragraph("Fee collection, rent receipts, visitor check-in/out, guest logs", body_style)],
        [Paragraph("<b>Supervisor 2</b>", body_style), Paragraph("100 Supervisors", body_style), Paragraph("1 per Hostel (Maintenance Desk)", body_style), Paragraph("Tenant maintenance complaints, room/bed status, repair tickets", body_style)],
    ]
    
    t_math = Table(math_data, colWidths=[85, 75, 140, 204])
    t_math.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BG_LIGHT),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('HEADERBACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_math)
    story.append(Spacer(1, 10))

    # PART 2: LIVE EXECUTABLE API OPERATIONS
    story.append(Paragraph("Part 2: Executable API Operations Reference (cURL, Payloads, Responses & SQL)", h1_style))
    story.append(Paragraph(
        "Below are exact executable examples for every core backend API endpoint. You can copy-paste these cURL commands directly into PowerShell, Command Prompt, or Postman during your senior presentation.",
        body_style
    ))

    # Op 1: Login
    story.append(Paragraph("2.1 Staff Authentication & Token Generation (POST /api/auth/login)", h2_style))
    op1_code = """# cURL Command (PowerShell / Terminal):
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email": "partner1@hostel.com", "password": "partnerPassword123"}'

# Response JSON (200 OK):
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "staff_id": 15, "name": "Rajesh Sharma", "role": "PARTNER", "hierarchy_level": 3 }
}

# Internal SQL Query Executed in Controller:
SELECT staff_id, name, email, password_hash, role_id FROM staff WHERE email = 'partner1@hostel.com' AND status = 'ACTIVE';"""
    story.append(Paragraph(op1_code, code_style))

    # Op 2: Head Enterprise Dashboard
    story.append(Paragraph("2.2 Head Enterprise Dashboard (GET /api/reports/enterprise-dashboard)", h2_style))
    op2_code = """# cURL Command (Head Access Across 100 Hostels):
curl -X GET http://localhost:5000/api/reports/enterprise-dashboard `
  -H "Authorization: Bearer <Head_JWT_Token>"

# Response JSON (200 OK):
{
  "status": "success",
  "role": "HEAD",
  "enterprise_stats": {
    "total_hostels": 100,
    "total_partners": 5,
    "gross_monthly_revenue": 7250000.00,
    "overall_occupancy_percent": 93.4,
    "partner_leaderboard": [
      { "partner_id": 15, "name": "Rajesh Sharma", "hostels": 20, "revenue": 1450000.00, "occupancy": "95.2%" },
      { "partner_id": 16, "name": "Anita Verma", "hostels": 20, "revenue": 1420000.00, "occupancy": "94.0%" }
    ]
  }
}

# Internal SQL Query Executed:
SELECT COUNT(DISTINCT h.hostel_id) as total_hostels, SUM(p.amount) as total_revenue,
       (COUNT(CASE WHEN b.status = 'OCCUPIED' THEN 1 END) * 100.0 / COUNT(b.bed_id)) as overall_occupancy
FROM hostel h LEFT JOIN floor f ON h.hostel_id = f.hostel_id LEFT JOIN room r ON f.floor_id = r.floor_id
LEFT JOIN bed b ON r.room_id = b.room_id LEFT JOIN payment p ON p.recorded_by IS NOT NULL WHERE h.status = 'ACTIVE';"""
    story.append(Paragraph(op2_code, code_style))

    # Op 3: Partner Portfolio Dashboard
    story.append(Paragraph("2.3 Partner Portfolio Dashboard (GET /api/reports/partner-dashboard)", h2_style))
    op3_code = """# cURL Command (Partner Access Scoped to 20 Hostels):
curl -X GET http://localhost:5000/api/reports/partner-dashboard `
  -H "Authorization: Bearer <Partner_JWT_Token>"

# Response JSON (200 OK):
{
  "status": "success",
  "role": "PARTNER",
  "partner_name": "Rajesh Sharma",
  "assigned_hostels_count": 20,
  "data": {
    "total_revenue": 1450000.00,
    "occupancy_rate": "95.2%",
    "managers": [
      { "manager_id": 101, "name": "Suresh Kumar", "hostels_managed": 5, "occupancy": "96.0%" },
      { "manager_id": 102, "name": "Priya Singh", "hostels_managed": 5, "occupancy": "94.5%" }
    ]
  }
}

# Internal SQL Query Executed (Role Scope Filter):
SELECT h.hostel_id, h.name, SUM(p.amount) as revenue
FROM hostel h
JOIN staff_hostel_scope shs ON h.hostel_id = shs.hostel_id
LEFT JOIN payment p ON p.recorded_by IS NOT NULL
WHERE shs.staff_id = ? AND h.status = 'ACTIVE' GROUP BY h.hostel_id;"""
    story.append(Paragraph(op3_code, code_style))

    # Op 4: Partner Promoted to Head
    story.append(Paragraph("2.4 Promote Partner to Head (POST /api/staff/promote)", h2_style))
    op4_code = """# cURL Command (Super Admin Executing Promotion):
curl -X POST http://localhost:5000/api/staff/promote `
  -H "Authorization: Bearer <SuperAdmin_JWT_Token>" `
  -H "Content-Type: application/json" `
  -d '{"staff_id": 15, "new_role_id": "HEAD", "notes": "Promoted Rajesh to 2nd Regional Head"}'

# Response JSON (200 OK):
{
  "status": "success",
  "message": "Staff member promoted successfully",
  "data": { "staff_id": 15, "old_role": "PARTNER", "new_role": "HEAD", "promoted_at": "2026-09-20T18:10:00Z" }
}

# Internal SQL Queries Executed (Atomic Transaction):
1. INSERT INTO staff_promotion_history (staff_id, old_role_id, new_role_id, promoted_by, notes) VALUES (15, 'PARTNER', 'HEAD', 1, '...');
2. UPDATE staff SET role_id = 'HEAD', parent_staff_id = NULL WHERE staff_id = 15;
3. DELETE FROM staff_hierarchy_closure WHERE descendant_id = 15;
4. INSERT INTO staff_hierarchy_closure (ancestor_id, descendant_id, depth) VALUES (15, 15, 0);"""
    story.append(Paragraph(op4_code, code_style))

    # Op 5: Bed Allocation (ACID Transaction)
    story.append(Paragraph("2.5 Transactional Bed Allocation (POST /api/allocations)", h2_style))
    op5_code = """# cURL Command (Allocating Bed 101-A to Tenant #5):
curl -X POST http://localhost:5000/api/allocations `
  -H "Authorization: Bearer <Manager_JWT_Token>" `
  -H "Content-Type: application/json" `
  -d '{"tenant_id": 5, "bed_id": 12, "start_date": "2026-09-01"}'

# Response JSON (201 Created):
{
  "status": "success",
  "message": "Bed allocated successfully",
  "data": { "allocation_id": 482, "tenant_id": 5, "bed_id": 12, "status": "ACTIVE", "room_status_updated": "FULL" }
}

# Internal SQL Execution (ACID Transaction & FOR UPDATE Row Lock):
1. START TRANSACTION;
2. SELECT status, room_id FROM bed WHERE bed_id = 12 FOR UPDATE; -- Exclusive write lock
3. INSERT INTO tenant_allocation (tenant_id, bed_id, start_date, allocated_by) VALUES (5, 12, '2026-09-01', 101);
4. UPDATE bed SET status = 'OCCUPIED' WHERE bed_id = 12;
5. SELECT COUNT(*) as occ FROM bed WHERE room_id = 10 AND status = 'OCCUPIED';
6. UPDATE room SET status = 'FULL' WHERE room_id = 10; -- Auto state update
7. COMMIT;"""
    story.append(Paragraph(op5_code, code_style))

    # Op 6: Supervisor 1 vs Supervisor 2 Domain Separation Test
    story.append(Paragraph("2.6 Supervisor Domain Isolation Test (403 Forbidden Guard)", h2_style))
    op6_code = """# cURL Command (Supervisor 1 Payment Desk attempting Maintenance API):
curl -X POST http://localhost:5000/api/maintenance/requests `
  -H "Authorization: Bearer <Supervisor1_Payment_Token>" `
  -H "Content-Type: application/json" `
  -d '{"complaint_id": 42, "assigned_to": 3, "description": "Fix Plumbing"}'

# Response JSON (403 Forbidden):
{
  "status": "fail",
  "error": "Forbidden: Access restricted to scope [SUPERVISOR_MAINTENANCE]. Your assigned scope is 'SUPERVISOR_FINANCE'."
}"""
    story.append(Paragraph(op6_code, code_style))

    story.append(Spacer(1, 10))

    # PART 3: KEY TECHNICAL WORKFLOWS
    story.append(Paragraph("Part 3: Key Technical Decisions & Deep Business Workflows", h1_style))

    workflows = [
        ("1. Closure Table Tree Traversal (O(1) Hierarchy Queries)",
         "Instead of writing slow, recursive self-joins to find all subordinates under a Partner or Head, we maintain a `staff_hierarchy_closure` table storing (ancestor_id, descendant_id, depth). Querying all 20 hostels or 4 managers under Partner #3 runs in a single O(1) indexed SQL SELECT query: `SELECT * FROM staff_hierarchy_closure WHERE ancestor_id = 3`."),
        
        ("2. Transactional Bed Allocation (POST /api/allocations)",
         "To prevent double-allocation under high concurrency, we wrap allocation in MySQL ACID transactions (`START TRANSACTION`). The bed query uses `SELECT * FROM bed WHERE bed_id = ? FOR UPDATE`, placing an exclusive row-level lock. The system verifies bed status is 'AVAILABLE', inserts the allocation, sets bed status 'OCCUPIED', and automatically updates room status to 'FULL' if room capacity is reached, committing cleanly."),
        
        ("3. Tenant Checkout & Auto-Room State Machine",
         "When checking out a tenant (`POST /api/allocations/:id/checkout`), the transaction updates allocation status to 'COMPLETED', restores bed status to 'AVAILABLE', and automatically checks if room status was 'FULL'. If room occupancy drops below capacity, room status is reverted to 'AVAILABLE' for instant bed search discovery."),
        
        ("4. Automated Equal Hostel Rebalancing Algorithm",
         "When new hostels are added (e.g. scaling from 100 to 120 hostels), `rebalanceEqualHostels()` calculates `Floor(Total Active Hostels / Total Active Partners)`. It divides hostels equally into 20-hostel chunks and inserts mapping records into `staff_hostel_scope`. Remainder hostels are assigned 1-by-1 to partners with lower load."),
        
        ("5. Maintenance Lifecycle & Target State Machine",
         "When a tenant submits a complaint (`POST /api/maintenance/complaints`), Supervisor 2 can convert it into a work request. Setting `mark_target_under_maintenance = true` automatically updates the target bed/room to 'MAINTENANCE' status, blocking new allocations. Upon repair completion, the system automatically restores target status back to 'AVAILABLE'."),
        
        ("6. No Physical Delete Strategy & Promotion History Audit Trail",
         "Core domain entities are never hard deleted from the database. Soft flags (`INACTIVE`, `LEFT`, `MAINTENANCE`) preserve full audit integrity. Promotions (Partner to Head) and role changes are recorded in `staff_promotion_history` with promoter ID, timestamp, and transition notes.")
    ]

    for title, desc in workflows:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(desc, body_style))

    story.append(Spacer(1, 10))

    # PART 4: SENIOR REVIEW QUESTIONS & ANSWERS
    story.append(Paragraph("Part 4: Senior Review Questions & Technical Answers", h1_style))
    story.append(Paragraph(
        "Here are 6 deep technical questions your senior evaluator is likely to ask, along with comprehensive, production-grade answers:",
        body_style
    ))

    qas = [
        ("❓ Question 1: 'How do you prevent race conditions if two supervisors attempt to allocate the exact same bed at the exact same millisecond?'",
         "<b>Answer:</b> We wrap the allocation flow inside an explicit database transaction (`START TRANSACTION`). The bed verification query uses `SELECT * FROM bed WHERE bed_id = ? FOR UPDATE`. This places an exclusive MySQL row-level write lock on that specific bed row. If a second supervisor attempts to allocate the same bed simultaneously, MySQL forces the second connection to wait until the first transaction commits or rolls back, preventing double booking."),

        ("❓ Question 2: 'Why did you use dynamic Closure Tables & Scope Mapping instead of foreign keys like partner_id on the hostel table?'",
         "<b>Answer:</b> Using hardcoded `partner_id` columns creates rigid database schemas that break when business rules evolve. If a Partner is promoted to Head, or a Partner leaves, or a Partner manages 30 hostels instead of 20, hardcoded schemas require breaking `ALTER TABLE` DDL migrations. Our Closure Table (`staff_hierarchy_closure`) and Scope Table (`staff_hostel_scope`) decouple hierarchy from data tables, allowing 100% constant database structure forever."),

        ("❓ Question 3: 'What happens when a Partner leaves the company? How are their 20 hostels reassigned?'",
         "<b>Answer:</b> Offboarding a departing Partner takes 0 database schema changes. We execute an atomic transaction: 1) Mark departing Partner status to 'INACTIVE', 2) Update `parent_staff_id` of their 4 Managers to point to a new or existing Partner ID, and 3) Update `staff_hostel_scope` to map the 20 hostels to the new Partner. All existing tenant allocations and hostel operations continue without interruption."),

        ("❓ Question 4: 'How does your authorization middleware enforce domain segregation between Supervisor 1 and Supervisor 2?'",
         "<b>Answer:</b> In `backend/src/middleware/auth.ts`, our `enforceScope()` middleware parses the JWT token's `role_id` and assigned scope. Routes like `/api/payments` require `SUPERVISOR_FINANCE` scope, while `/api/maintenance` routes require `SUPERVISOR_MAINTENANCE` scope. If Supervisor 1 attempts to call maintenance endpoints, or Supervisor 2 attempts to call payment endpoints, the middleware rejects the request with an HTTP 403 Forbidden error."),

        ("❓ Question 5: 'Why did you write raw SQL queries via mysql2/promise instead of using an ORM like TypeORM or Prisma?'",
         "<b>Answer:</b> Using `mysql2/promise` with parametrized prepared statements (`?`) gives us maximum execution speed, zero ORM object-relational mapping overhead, and direct fine-grained control over MySQL transaction locking (`FOR UPDATE`). It allows us to write optimized multi-table JOIN queries for enterprise analytics while guaranteeing complete SQL injection immunity."),

        ("❓ Question 6: 'Why are Maintenance Complaints separated from Maintenance Work Requests into two separate tables?'",
         "<b>Answer:</b> Separating `maintenance_complaint` and `maintenance_request` follows the Separation of Concerns principle. Complaints are tenant-facing operational logs representing reported issues. Requests represent internal maintenance execution work orders assigned to technicians. Not all complaints become work requests (some are duplicates or invalid). This separation allows tracking technician resolution SLAs and progress updates without cluttering original complaint records.")
    ]

    for q, a in qas:
        story.append(Paragraph(q, qa_question_style))
        story.append(Paragraph(a, qa_answer_style))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=10, spaceAfter=15))
    story.append(Paragraph("<i>End of Senior Presentation & Architecture Guide — Enterprise Hostel Management System</i>", ParagraphStyle('EndNote', parent=body_style, alignment=1, textColor=colors.HexColor("#64748B"))))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {filename}")

if __name__ == '__main__':
    output_path = sys.argv[1] if len(sys.argv) > 1 else "Senior_Presentation_Guide_Hostel_Management.pdf"
    build_pdf(output_path)
