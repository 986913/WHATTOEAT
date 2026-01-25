import { create } from 'zustand';
import React from 'react';

export interface MenuItem {
  id: number;
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuState {
  menus: MenuItem[];
}

export const useMenuStore = create<MenuState>(() => ({
  menus: [
    {
      id: 1,
      name: 'Dashboard',
      path: '/home/dashboard',
      icon: <i className='fa-solid fa-house'></i>,
    },
    {
      id: 2,
      name: 'Users Management',
      path: '/home/users',
      icon: <i className='fa-solid fa-user'></i>,
    },
    {
      id: 3,
      name: 'Roles Management',
      path: '/home/roles',
      icon: <i className='fa-solid fa-screwdriver-wrench'></i>,
    },
    {
      id: 4,
      name: 'Menus Management',
      path: '/home/menus',
      icon: <i className='fa-solid fa-bars'></i>,
    },
    {
      id: 5,
      name: 'Meals Management',
      path: '/home/meals',
      icon: <i className='fa-solid fa-bowl-food'></i>,
    },
    {
      id: 6,
      name: 'Ingredients Management',
      path: '/home/ingredients',
      icon: <i className='fa-solid fa-bottle-droplet'></i>,
    },
    {
      id: 7,
      name: 'Plans Management',
      path: '/home/plans',
      icon: <i className='fa-solid fa-record-vinyl'></i>,
    },
    {
      id: 8,
      name: 'API Testing',
      path: '/home/apitest',
      icon: <i className='fa-solid fa-vial'></i>,
    },
  ],
}));
