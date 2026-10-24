import type { ComponentType } from 'react';

export interface NavItem {
  href: string;
  labelBn: string;
  labelEn: string;
  icon: ComponentType<{ className?: string }>;
  testId: string;
  badge?: string;
}

export interface NavSection {
  id: string;
  titleBn: string;
  titleEn: string;
  items: NavItem[];
}

export interface RoleWidget {
  titleBn: string;
  titleEn: string;
  descBn: string;
  descEn: string;
  icon: ComponentType<{ className?: string }>;
  accentColor: string;
}

export interface RoleConfig {
  badgeBn: string;
  badgeEn: string;
  badgeClasses: string;
  portalTitleBn: string;
  portalTitleEn: string;
  widget?: RoleWidget;
}
