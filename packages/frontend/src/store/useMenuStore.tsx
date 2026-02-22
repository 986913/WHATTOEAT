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
      name: 'Generate Weekly Plans',
      path: '/home/wkplans',
      icon: <i className='fa-solid fa-burger'></i>,
      roles: [RoleForUI.USER, RoleForUI.ADMIN],
    },
    {
      id: 2,
      name: 'My Plans',
      path: '/home/userplans',
      icon: <i className='fa-solid fa-eye'></i>,
      roles: [RoleForUI.USER, RoleForUI.ADMIN],
    },
    {
      id: 3,
      name: '(Admin) All Plans',
      path: '/home/plans',
      icon: <i className='fa-solid fa-record-vinyl'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 4,
      name: '(Admin) All Users',
      path: '/home/users',
      icon: <i className='fa-solid fa-user'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 5,
      name: '(Admin) All Meals',
      path: '/home/meals',
      icon: <i className='fa-solid fa-bowl-food'></i>,
      roles: [RoleForUI.ADMIN],
    },
    {
      id: 6,
      name: '(Admin) All Ingredients',
      path: '/home/ingredients',
      icon: <i className='fa-solid fa-leaf'></i>,
      roles: [RoleForUI.ADMIN],
    },
    // {
    //   id: 7,
    //   name: '(Admin) Roles Management',
    //   path: '/home/roles',
    //   icon: <i className='fa-solid fa-screwdriver-wrench'></i>,
    //   roles: [RoleForUI.ADMIN],
    // },
    // {
    //   id: 1,
    //   name: 'Dashboard',
    //   path: '/home/dashboard',
    //   icon: <i className='fa-solid fa-house'></i>,
    // },
    // {
    //   id: 9,
    //   name: 'API Testing',
    //   path: '/home/apitest',
    //   icon: <i className='fa-solid fa-vial'></i>,
    // },
  ],
}));
