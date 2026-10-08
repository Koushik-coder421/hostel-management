-- =========================================================
-- HOSTEL MANAGEMENT SYSTEM
-- Complete MySQL Database Schema (ER Diagram Compliant)
-- =========================================================

CREATE DATABASE IF NOT EXISTS hostel_management;
USE hostel_management;

-- =========================================================
-- 1. ORGANIZATION STRUCTURE & HIERARCHY
-- =========================================================

-- Staff / Person Base Table
CREATE TABLE IF NOT EXISTS staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    phone VARCHAR(15) UNIQUE,
    role VARCHAR(50) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS person (
    person_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) UNIQUE,
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS superadmin (
    superadmin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_assignment (
    role_assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL,
    role_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS head (
    head_id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partner (
    partner_id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS manager (
    manager_id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS supervisor (
    supervisor_id INT AUTO_INCREMENT PRIMARY KEY,
    person_id INT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE
);

-- Organization Assignments (History Preserving)
CREATE TABLE IF NOT EXISTS head_partner_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    head_id INT NOT NULL,
    partner_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (head_id) REFERENCES head(head_id),
    FOREIGN KEY (partner_id) REFERENCES partner(partner_id)
);

CREATE TABLE IF NOT EXISTS partner_manager_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    partner_id INT NOT NULL,
    manager_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partner(partner_id),
    FOREIGN KEY (manager_id) REFERENCES manager(manager_id)
);

-- =========================================================
-- 2. HOSTEL, FLOOR, ROOM, BED & FACILITIES
-- =========================================================

CREATE TABLE IF NOT EXISTS hostel (
    hostel_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_code VARCHAR(50) NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hostel_staff (
    hostel_id INT NOT NULL,
    staff_id INT NOT NULL,
    assigned_from DATE NOT NULL,
    assigned_to DATE,
    PRIMARY KEY (hostel_id, staff_id, assigned_from),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS manager_hostel_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    manager_id INT NOT NULL,
    hostel_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES manager(manager_id),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id)
);

CREATE TABLE IF NOT EXISTS hostel_supervisor_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    supervisor_id INT NOT NULL,
    assignment_role ENUM('TENANT_ADMIN', 'MAINTENANCE') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id),
    FOREIGN KEY (supervisor_id) REFERENCES supervisor(supervisor_id)
);

CREATE TABLE IF NOT EXISTS partner_hostel_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    partner_id INT NOT NULL,
    hostel_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partner(partner_id),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id)
);

CREATE TABLE IF NOT EXISTS floor (
    floor_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    floor_number INT NOT NULL,
    name VARCHAR(50),
    UNIQUE (hostel_id, floor_number),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (floor_number >= 0)
);

CREATE TABLE IF NOT EXISTS room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    floor_id INT NOT NULL,
    hostel_id INT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(50),
    sharing_type VARCHAR(20) NULL,
    capacity INT NOT NULL,
    status ENUM('AVAILABLE', 'FULL', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (floor_id, room_number),
    FOREIGN KEY (floor_id) REFERENCES floor(floor_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS bed (
    bed_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(50) NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
    reason VARCHAR(255) NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (room_id, bed_number),
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS facility (
    facility_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('AVAILABLE', 'UNAVAILABLE') DEFAULT 'AVAILABLE',
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS hostel_facility (
    hostel_facility_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    facility_id INT NOT NULL,
    name VARCHAR(100) NULL,
    location VARCHAR(100) NULL,
    status ENUM('AVAILABLE', 'UNAVAILABLE') DEFAULT 'AVAILABLE',
    available_from DATE NULL,
    available_until DATE NULL,
    remarks TEXT NULL,
    UNIQUE (hostel_id, facility_id),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facility(facility_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =========================================================
-- 3. TENANT & ALLOCATION MANAGEMENT
-- =========================================================

CREATE TABLE IF NOT EXISTS tenant (
    tenant_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NULL,
    last_name VARCHAR(50) NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(15) NOT NULL UNIQUE,
    gender ENUM('MALE', 'FEMALE', 'OTHER'),
    date_of_birth DATE,
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    registration_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('ACTIVE', 'INACTIVE', 'LEFT') DEFAULT 'ACTIVE',
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_document (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    document_path VARCHAR(255),
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    verified_by INT NULL,
    verified_at DATETIME NULL,
    remarks TEXT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS emergency_contact (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(15) NOT NULL,
    address TEXT,
    is_primary BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_preference (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    preferred_sharing_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_stay (
    tenant_stay_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE,
    stay_status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
    check_in_by INT NULL,
    check_out_by INT NULL,
    remarks TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT,
    FOREIGN KEY (check_in_by) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (check_out_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tenant_allocation (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_stay_id INT NULL,
    tenant_id INT NOT NULL,
    bed_id INT NOT NULL,
    allocation_date DATE NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'ENDED') DEFAULT 'ACTIVE',
    allocated_by INT NOT NULL,
    remarks TEXT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (bed_id) REFERENCES bed(bed_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (tenant_stay_id) REFERENCES tenant_stay(tenant_stay_id) ON DELETE SET NULL,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =========================================================
-- 4. RENT, PAYMENTS, RECEIPTS & EXPENSES
-- =========================================================

CREATE TABLE IF NOT EXISTS rent_structure (
    rent_structure_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type VARCHAR(50) NOT NULL,
    sharing_type VARCHAR(50) NULL,
    amount DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS rent (
    rent_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_stay_id INT NULL,
    tenant_id INT NOT NULL,
    rent_structure_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('PENDING', 'PAID') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_stay_id) REFERENCES tenant_stay(tenant_stay_id) ON DELETE SET NULL,
    FOREIGN KEY (rent_structure_id) REFERENCES rent_structure(rent_structure_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    rent_id INT NULL,
    tenant_id INT NOT NULL,
    allocation_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_type ENUM('RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OTHER') NOT NULL,
    payment_method ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'),
    transaction_reference VARCHAR(100),
    status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'SUCCESS',
    recorded_by INT NOT NULL,
    remarks TEXT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (allocation_id) REFERENCES tenant_allocation(allocation_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (rent_id) REFERENCES rent(rent_id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS receipt (
    receipt_id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL UNIQUE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    receipt_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by INT NOT NULL,
    receipt_path VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'GENERATED',
    remarks TEXT NULL,
    FOREIGN KEY (payment_id) REFERENCES payment(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES staff(staff_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expense_category (
    expense_category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    remarks TEXT
);

-- =========================================================
-- 5. MAINTENANCE & COMPLAINTS
-- =========================================================

CREATE TABLE IF NOT EXISTS maintenance_target (
    target_id INT AUTO_INCREMENT PRIMARY KEY,
    target_type ENUM('ROOM', 'BED', 'FACILITY') NOT NULL,
    room_id INT NULL,
    bed_id INT NULL,
    hostel_facility_id INT NULL,
    description TEXT,
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE CASCADE,
    FOREIGN KEY (bed_id) REFERENCES bed(bed_id) ON DELETE CASCADE,
    FOREIGN KEY (hostel_facility_id) REFERENCES hostel_facility(hostel_facility_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maintenance_complaint (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    tenant_stay_id INT NULL,
    target_type ENUM('ROOM', 'BED', 'FACILITY') NOT NULL,
    target_id INT NOT NULL,
    title VARCHAR(150) NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'UNDER_REVIEW', 'CONVERTED', 'RESOLVED', 'CLOSED', 'REJECTED') DEFAULT 'OPEN',
    resolved_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (tenant_stay_id) REFERENCES tenant_stay(tenant_stay_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NULL,
    target_id INT NULL,
    maintenance_type ENUM('CORRECTIVE', 'PREVENTIVE') DEFAULT 'CORRECTIVE',
    raised_by INT NOT NULL,
    assigned_to INT NULL,
    description TEXT,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('RAISED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'RAISED',
    assigned_at DATETIME NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    resolution_details TEXT NULL,
    verified_by INT NULL,
    verified_at DATETIME NULL,
    remarks TEXT NULL,
    FOREIGN KEY (complaint_id) REFERENCES maintenance_complaint(complaint_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (raised_by) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES staff(staff_id) ON DELETE SET NULL,
    FOREIGN KEY (target_id) REFERENCES maintenance_target(target_id) ON DELETE SET NULL,
    CHECK (completed_at IS NULL OR assigned_at IS NULL OR completed_at >= assigned_at)
);

CREATE TABLE IF NOT EXISTS maintenance_update (
    update_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    updated_by INT NOT NULL,
    status ENUM('RAISED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL,
    remarks TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES maintenance_request(request_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES staff(staff_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS expense (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    maintenance_id INT NULL,
    expense_category_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    recorded_by INT NOT NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    remarks TEXT NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT,
    FOREIGN KEY (maintenance_id) REFERENCES maintenance_request(request_id) ON DELETE SET NULL,
    FOREIGN KEY (expense_category_id) REFERENCES expense_category(expense_category_id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES staff(staff_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES staff(staff_id) ON DELETE SET NULL
);

-- =========================================================
-- 6. VISITOR MANAGEMENT
-- =========================================================

CREATE TABLE IF NOT EXISTS visitor (
    visitor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    address VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visit (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    hostel_id INT NOT NULL,
    purpose VARCHAR(255),
    visit_date DATE NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    status ENUM('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED') DEFAULT 'EXPECTED',
    verified_by INT,
    FOREIGN KEY (visitor_id) REFERENCES visitor(visitor_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES staff(staff_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (check_out IS NULL OR check_out >= check_in)
);

CREATE TABLE IF NOT EXISTS visit_tenant (
    visit_id INT NOT NULL,
    tenant_id INT NOT NULL,
    relationship VARCHAR(50),
    remarks VARCHAR(255),
    PRIMARY KEY (visit_id, tenant_id),
    FOREIGN KEY (visit_id) REFERENCES visit(visit_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =========================================================
-- 7. AUDIT LOG & HISTORY TRACKING
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    performed_by VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
