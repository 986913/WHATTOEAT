import '../App.css';
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

  // logout 统一逻辑
  const handleLogout = useCallback(() => {
    localStorage.removeItem('access_token');
    clearCurrentUser();
    navigate('/signin', { replace: true });
  }, [clearCurrentUser, navigate]);

  // 初始化恢复
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
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-2 p-0'>
          <SidebarNav />
        </div>
        <div className='col-10 p-0'>
          <div className='row'>
            <div className='container-fluid'>
              <HeaderNav onLogout={handleLogout} />
              <main>
                <Outlet /> {/* 这里会渲染 Dashboard 或其他APItest等子路由 */}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
