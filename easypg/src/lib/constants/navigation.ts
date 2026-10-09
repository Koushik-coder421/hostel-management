import type { AppRole } from './permissions.js';

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  mobileNav: boolean; // Show in mobile bottom nav
}

const PLATFORM_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Live Stream', href: '/live-stream', icon: 'video', mobileNav: false },
  { label: 'Hierarchy', href: '/hierarchy', icon: 'shield', mobileNav: false },
  { label: 'Organizations', href: '/organizations', icon: 'building-2', mobileNav: false },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Staff & Managers', href: '/managers', icon: 'users', mobileNav: false },
  { label: 'Residents', href: '/residents', icon: 'users', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-3', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const ORG_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Live Stream', href: '/live-stream', icon: 'video', mobileNav: false },
  { label: 'Hierarchy', href: '/hierarchy', icon: 'shield', mobileNav: false },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Staff & Managers', href: '/managers', icon: 'user-cog', mobileNav: false },
  { label: 'Residents', href: '/residents', icon: 'users', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Payments', href: '/payments', icon: 'credit-card', mobileNav: true },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-3', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const HEAD_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Hierarchy', href: '/hierarchy', icon: 'shield', mobileNav: false },
  { label: 'Organizations', href: '/organizations', icon: 'building-2', mobileNav: false },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Staff & Managers', href: '/managers', icon: 'users', mobileNav: false },
  { label: 'Residents', href: '/residents', icon: 'users', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-3', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const MANAGER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Residents', href: '/residents', icon: 'users', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Check-In', href: '/check-ins', icon: 'log-in', mobileNav: false },
  { label: 'Check-Out', href: '/check-outs', icon: 'log-out', mobileNav: false },
  { label: 'Payments', href: '/payments', icon: 'credit-card', mobileNav: true },
  { label: 'Reports', href: '/reports', icon: 'bar-chart-3', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const SUPERVISOR_TENANT_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Residents', href: '/residents', icon: 'users', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Check-In', href: '/check-ins', icon: 'log-in', mobileNav: false },
  { label: 'Check-Out', href: '/check-outs', icon: 'log-out', mobileNav: false },
  { label: 'Visitor Management', href: '/visitors', icon: 'users', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const SUPERVISOR_MAINTENANCE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Hostels', href: '/hostels', icon: 'home', mobileNav: true },
  { label: 'Rooms & Beds', href: '/rooms', icon: 'bed-double', mobileNav: true },
  { label: 'Maintenance', href: '/maintenance', icon: 'wrench', mobileNav: true },
  { label: 'Expenses', href: '/expenses', icon: 'receipt', mobileNav: false },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: false }
];

const TENANT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard', mobileNav: true },
  { label: 'Settings', href: '/settings', icon: 'settings', mobileNav: true }
];

export function getNavItems(role: AppRole | string, responsibility?: string | null): NavItem[] {
  switch (role) {
    case 'platform_admin':
    case 'superadmin':
    case 'SUPERADMIN':
    case 'admin':
    case 'ADMIN':
      return PLATFORM_ADMIN_NAV;
    case 'head':
    case 'HEAD':
      return HEAD_NAV;
    case 'organization_admin':
    case 'org_admin':
    case 'ORG_ADMIN':
    case 'partner':
    case 'PARTNER':
      return ORG_ADMIN_NAV;
    case 'manager':
    case 'MANAGER':
      return MANAGER_NAV;
    case 'supervisor':
    case 'SUPERVISOR':
      if (responsibility === 'MAINTENANCE') {
        return SUPERVISOR_MAINTENANCE_NAV;
      }
      return SUPERVISOR_TENANT_ADMIN_NAV;
    case 'tenant':
    case 'TENANT':
    case 'resident':
    case 'RESIDENT':
      return TENANT_NAV;
    default:
      return MANAGER_NAV;
  }
}

export function getMobileNavItems(role: AppRole | string, responsibility?: string | null): NavItem[] {
  const items = getNavItems(role, responsibility).filter(item => item.mobileNav);
  return items.slice(0, 4);
}
