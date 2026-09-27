import type { Component } from 'svelte';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Building2 from '@lucide/svelte/icons/building-2';
import Home from '@lucide/svelte/icons/home';
import Users from '@lucide/svelte/icons/users';
import UserCog from '@lucide/svelte/icons/user-cog';
import BedDouble from '@lucide/svelte/icons/bed-double';
import CreditCard from '@lucide/svelte/icons/credit-card';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Settings from '@lucide/svelte/icons/settings';
import LogIn from '@lucide/svelte/icons/log-in';
import LogOut from '@lucide/svelte/icons/log-out';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';

export const ICON_MAP: Record<string, Component<any>> = {
  'layout-dashboard': LayoutDashboard,
  'building-2': Building2,
  'home': Home,
  'users': Users,
  'user-cog': UserCog,
  'bed-double': BedDouble,
  'credit-card': CreditCard,
  'bar-chart-3': BarChart3,
  'settings': Settings,
  'log-in': LogIn,
  'log-out': LogOut,
  'more-horizontal': MoreHorizontal
};

export function getNavIcon(name: string): Component<any> {
  return ICON_MAP[name] ?? Home;
}
