import { create } from 'zustand';
import React from 'react';

export enum RoleForUI {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface MenuItem {
  id: number;
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: RoleForUI[];
}

interface MenuState {
  menus: MenuItem[];
}

export const useMenuStore = create<MenuState>(() => ({
  menus: [
    {
      id: 1,
      name: 'Today',
      path: '/home/today',
      icon: <i className='fa-solid fa-house'></i>,
      roles: [RoleForUI.USER, RoleForUI.ADMIN],
    },
    {
      id: 2,
      name: 'Plan Your Week',
      path: '/home/wkplans',
      icon: <i className='fa-solid fa-calendar-week'></i>,
      roles: [RoleForUI.USER, RoleForUI.ADMIN],
    },
    {
      id: 3,
      name: 'History',
      path: '/home/userplans',
      icon: <i className='fa-solid fa-clock-rotate-left'></i>,
      roles: [RoleForUI.USER, RoleForUI.ADMIN],
    },
    {
      id: 10,
      name: 'All Plans',
      path: '/home/plans',
      icon: <i className='fa-solid fa-list-check'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 11,
      name: 'All Users',
      path: '/home/users',
      icon: <i className='fa-solid fa-users'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 12,
      name: 'All Meals',
      path: '/home/meals',
      icon: <i className='fa-solid fa-bowl-food'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 13,
      name: 'All Ingredients',
      path: '/home/ingredients',
      icon: <i className='fa-solid fa-leaf'></i>,
      roles: [RoleForUI.ADMIN],
    },
  ],
}));
