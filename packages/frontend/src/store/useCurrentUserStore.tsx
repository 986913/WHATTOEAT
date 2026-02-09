import { create } from 'zustand';

type CurrentUser = {
  username?: string;
  avatarUrl?: string;
};

type CurrentUserState = {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser) => void; // ⭐ 核心：setter
  clearCurrentUser: () => void;
};

export const useCurrentUserStore = create<CurrentUserState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) =>
    set({
      currentUser: user,
    }),
  clearCurrentUser: () =>
    set({
      currentUser: null,
    }),
}));
