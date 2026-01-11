import { create } from 'zustand';

export interface MenuItem {
  id: number;
  name: string;
  path: string;
}

interface MenuState {
  menus: MenuItem[];
}

export const useMenuStore = create<MenuState>(() => ({
  menus: [
    { id: 1, name: 'Dashboard', path: '/home/dashboard' },
    { id: 2, name: 'Users Management', path: '/home/users' },
    { id: 3, name: 'Roles Management', path: '/home/roles' },
    { id: 4, name: 'Menus Management', path: '/home/menus' },
    { id: 5, name: 'API Testing', path: '/home/apitest' },
  ],
}));
