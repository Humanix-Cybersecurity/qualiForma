// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  Inbox,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FolderClosed,
  LayoutDashboard,
  FileSignature,
  MessageSquareWarning,
  Receipt,
  ScrollText,
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
        { to: '/app/reclamations', labelKey: 'reclamations', icon: MessageSquareWarning },
      ];
    case 'formateur':
      return [
        DASHBOARD,
        { to: '/app/creneaux', labelKey: 'creneaux', icon: CalendarCheck },
        { to: '/app/planning', labelKey: 'planning', icon: CalendarDays },
        { to: '/app/sessions', labelKey: 'sessions', icon: CalendarCheck },
        { to: '/app/reclamations', labelKey: 'reclamations', icon: MessageSquareWarning },
      ];
    case 'admin_of':
      return [
        DASHBOARD,
        { to: '/app/formations', labelKey: 'formations', icon: BookOpen },
        { to: '/app/sessions', labelKey: 'sessions', icon: CalendarCheck },
        { to: '/app/planning', labelKey: 'planning', icon: CalendarDays },
        { to: '/app/demandes', labelKey: 'demandes', icon: Inbox },
        { to: '/app/conventions', labelKey: 'conventions', icon: ScrollText },
        { to: '/app/devis', labelKey: 'devis', icon: FileSignature },
        { to: '/app/facturation', labelKey: 'facturation', icon: Receipt },
        { to: '/app/utilisateurs', labelKey: 'utilisateurs', icon: Users },
        { to: '/app/questionnaires', labelKey: 'questionnaires', icon: ClipboardList },
        { to: '/app/qualiopi', labelKey: 'qualiopi', icon: ClipboardCheck },
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
