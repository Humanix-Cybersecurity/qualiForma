// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FolderClosed,
  LayoutDashboard,
  MessageSquareWarning,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Claims } from './lib/api';

export interface NavItem {
  to: string;
  /** Clé i18n sous `nav.*`. */
  labelKey: string;
  icon: LucideIcon;
}

const DASHBOARD: NavItem = { to: '/app', labelKey: 'dashboard', icon: LayoutDashboard };

/** Entrées de navigation accessibles selon le rôle (mapping des fonctionnalités). */
export function navForRole(role: Claims['role']): NavItem[] {
  switch (role) {
    case 'apprenant':
      return [
        DASHBOARD,
        { to: '/app/creneaux', labelKey: 'creneaux', icon: CalendarCheck },
        { to: '/app/questionnaires', labelKey: 'questionnaires', icon: ClipboardList },
        { to: '/app/attestations', labelKey: 'attestations', icon: Award },
      ];
    case 'formateur':
      return [
        DASHBOARD,
        { to: '/app/creneaux', labelKey: 'creneaux', icon: CalendarCheck },
        { to: '/app/sessions', labelKey: 'sessions', icon: CalendarCheck },
      ];
    case 'admin_of':
      return [
        DASHBOARD,
        { to: '/app/formations', labelKey: 'formations', icon: BookOpen },
        { to: '/app/sessions', labelKey: 'sessions', icon: CalendarCheck },
        { to: '/app/utilisateurs', labelKey: 'utilisateurs', icon: Users },
        { to: '/app/questionnaires', labelKey: 'questionnaires', icon: ClipboardList },
        { to: '/app/documents', labelKey: 'documents', icon: FolderClosed },
        { to: '/app/reclamations', labelKey: 'reclamations', icon: MessageSquareWarning },
      ];
    case 'super_admin':
      return [
        DASHBOARD,
        { to: '/app/tenants', labelKey: 'tenants', icon: Building2 },
        { to: '/app/plans', labelKey: 'plans', icon: CreditCard },
      ];
    case 'referent_handicap':
    default:
      return [DASHBOARD];
  }
}
