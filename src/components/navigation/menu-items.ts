export type MenuItem = {
  readonly label: string;
  readonly href: string;
  readonly external: boolean;
  readonly status: 'active' | 'coming-soon';
};

export type MenuSection = {
  readonly heading?: string;
  readonly items: readonly MenuItem[];
};

export const menuSections: readonly MenuSection[] = [
  {
    items: [
      {
        label: 'The Garden',
        href: 'https://huntingforcarrots.com',
        external: true,
        status: 'active',
      },
      {
        label: 'Find My Way',
        href: 'https://findmyway.huntingforcarrots.com',
        external: true,
        status: 'active',
      },
    ],
  },
  {
    items: [
      { label: 'Enough', href: '', external: false, status: 'coming-soon' },
      { label: 'Hourglass', href: '', external: false, status: 'coming-soon' },
      { label: 'Sunk Cost', href: '', external: false, status: 'coming-soon' },
    ],
  },
  {
    items: [{ label: 'About', href: '/about', external: false, status: 'active' }],
  },
] as const;
