import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import SidebarNav from '../components/SidebarNav';
import HeaderNav from '../components/HeaderNav';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

export default function DefaultLayout() {
  const navigate = useNavigate();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    clearCurrentUser();
    navigate('/signin', { replace: true });
  }, [clearCurrentUser, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/signin', { replace: true });
      return;
    }

    axios
      .get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data);
      })
      .catch(() => {
        handleLogout();
      });
  }, [setCurrentUser, handleLogout, navigate]);

  return (
    <div className='app-layout'>
      <aside className='app-sidebar'>
        <SidebarNav />
      </aside>

      <div className='app-main'>
        <HeaderNav onLogout={handleLogout} />

        <main className='app-content'>
          <Outlet />
        </main>

        <footer className='app-footer'>
          <span>🎲 MealDice</span>
          <span className='footer-divider'>·</span>
          <span>Plan smarter. Eat better</span>
          <span className='footer-divider'>·</span>
          <span>© 2026 Mingyue Liu</span>
        </footer>
      </div>
    </div>
  );
}
