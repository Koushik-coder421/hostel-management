-- =========================================================
-- HOSTEL MANAGEMENT SYSTEM - FINAL CONSOLIDATED SCHEMA V3 (FROZEN)
-- Target Architecture: Exactly 17 Tables (57.5% Reduction)
-- Preserves business entities, historical records, FK constraints,
-- audit logs, and hierarchy tracking with application-level validation.
-- =========================================================

CREATE DATABASE IF NOT EXISTS hostel_management_v3;
USE hostel_management_v3;

-- =========================================================
-- 1. USERS & ACCESS (1 Table)
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(15) UNIQUE,
    password_hash VARCHAR(255) NULL,
    role ENUM(
        'SUPERADMIN',
        'HEAD',
        'PARTNER',
        'MANAGER',
        'SUPERVISOR',
        'STAFF',
        'TENANT'
    ) NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. INFRASTRUCTURE & PROPERTIES (4 Tables)
-- (Created BEFORE hierarchy_assignments to satisfy Foreign Keys)
-- =========================================================

CREATE TABLE IF NOT EXISTS hostel (
    hostel_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_code VARCHAR(50) NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(20) NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Room table embeds floor_number and rent_amount directly (eliminating floor & rent_structure tables)
CREATE TABLE IF NOT EXISTS room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor_number INT NOT NULL DEFAULT 1, -- Explicit floor number (e.g. Room 205 -> floor 2)
    room_type VARCHAR(50) NULL,
    sharing_type VARCHAR(20) NULL,
    capacity INT NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Active room rent amount
    status ENUM('AVAILABLE', 'FULL', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (hostel_id, room_number),
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT ON UPDATE CASCADE,
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
    FOREIGN KEY (room_id) REFERENCES room(room_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Direct hostel-to-facility relationship with uniqueness rule (hostel_facility junction table eliminated)
CREATE TABLE IF NOT EXISTS facility (
    facility_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    status ENUM('AVAILABLE', 'UNAVAILABLE') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hostel_id, name), -- Uniqueness constraint prevents duplicate facility entries per hostel
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =========================================================
-- 3. HIERARCHY ASSIGNMENTS (1 Table)
-- (Created after hostel to bind child_hostel_id FK cleanly)
-- =========================================================

CREATE TABLE IF NOT EXISTS hierarchy_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_user_id INT NULL,
    child_user_id INT NULL,
    child_hostel_id INT NULL,
    assignment_type ENUM(
        'HEAD_PARTNER',
        'PARTNER_MANAGER',
        'PARTNER_HOSTEL',
        'MANAGER_HOSTEL',
        'SUPERVISOR_HOSTEL'
    ) NOT NULL,
    assignment_role VARCHAR(50) NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (child_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (child_hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =========================================================
-- 4. TENANT DOMAIN (4 Tables)
-- =========================================================

CREATE TABLE IF NOT EXISTS tenant (
    tenant_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    emergency_contact JSON NULL,
    preferences JSON NULL,
    first_name VARCHAR(50) NULL,
    last_name VARCHAR(50) NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    date_of_birth DATE NULL,
    registration_date DATE DEFAULT (CURRENT_DATE),
    status ENUM('ACTIVE', 'INACTIVE', 'LEFT') DEFAULT 'ACTIVE',
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tenant_document (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NULL,
    document_path VARCHAR(255) NULL,
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    verified_by INT NULL,
    verified_at DATETIME NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tenant_stay (
    tenant_stay_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NULL,
    stay_status ENUM('ACTIVE', 'COMPLETED') DEFAULT 'ACTIVE',
    check_in_by INT NULL,
    check_out_by INT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT,
    FOREIGN KEY (check_in_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (check_out_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Removes redundant tenant_id & allocation_date; derives tenant identity cleanly via tenant_stay_id
CREATE TABLE IF NOT EXISTS tenant_allocation (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_stay_id INT NOT NULL,
    bed_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'ENDED') DEFAULT 'ACTIVE',
    allocated_by INT NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_stay_id) REFERENCES tenant_stay(tenant_stay_id) ON DELETE RESTRICT,
    FOREIGN KEY (bed_id) REFERENCES bed(bed_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =========================================================
-- 5. FINANCIAL DOMAIN (4 Tables)
-- =========================================================

-- Removes redundant tenant_id; derives tenant identity via tenant_stay_id
CREATE TABLE IF NOT EXISTS rent (
    rent_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_stay_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    billing_period VARCHAR(20) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') DEFAULT 'PENDING',
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_stay_id) REFERENCES tenant_stay(tenant_stay_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    rent_id INT NULL,
    tenant_id INT NOT NULL,
    allocation_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    grace_period_days INT DEFAULT 5,
    paid_at DATETIME NULL,
    payment_type ENUM('RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OTHER') NOT NULL,
    payment_method ENUM('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER') NULL,
    transaction_reference VARCHAR(100) NULL,
    status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    recorded_by INT NOT NULL,
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (allocation_id) REFERENCES tenant_allocation(allocation_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (rent_id) REFERENCES rent(rent_id) ON DELETE SET NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
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
    FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expense (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    category ENUM('MAINTENANCE', 'UTILITIES', 'SALARY', 'SUPPLIES', 'OTHER') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT NULL,
    recorded_by INT NOT NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    remarks TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT,
    FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- =========================================================
-- 6. MAINTENANCE DOMAIN (2 Tables)
-- =========================================================

CREATE TABLE IF NOT EXISTS maintenance_ticket (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    hostel_id INT NOT NULL,
    target_type ENUM('ROOM', 'BED', 'FACILITY') NOT NULL,
    target_id INT NOT NULL, -- Service-layer validated polymorphic reference
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    maintenance_type ENUM('CORRECTIVE', 'PREVENTIVE') DEFAULT 'CORRECTIVE',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    raised_by INT NOT NULL,
    assigned_to INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE RESTRICT,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE RESTRICT,
    FOREIGN KEY (raised_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_update (
    update_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    updated_by INT NOT NULL,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    remarks TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES maintenance_ticket(ticket_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- =========================================================
-- 7. CROSS-CUTTING SYSTEM LOG (1 Table)
-- =========================================================

CREATE TABLE IF NOT EXISTS system_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    log_category ENUM('VISITOR', 'BED_ALLOCATION', 'STAY_HISTORY', 'ASSIGNMENT', 'AUDIT_TRACE') NOT NULL,
    user_id INT NULL,
    tenant_id INT NULL,
    hostel_id INT NULL,
    action VARCHAR(100) NOT NULL,
    log_details JSON NOT NULL, -- Visitor details, assignment changes, check-in/out timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE SET NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostel(hostel_id) ON DELETE SET NULL
);
