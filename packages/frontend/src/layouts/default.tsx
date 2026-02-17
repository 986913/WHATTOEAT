import '../App.css';
import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import axios from '../utils/axios';
import SidebarNav from '../components/SidebarNav';
import HeaderNav from '../components/HeaderNav';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

export default function DefaultLayout() {
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);
  const clearCurrentUser = useCurrentUserStore((s) => s.clearCurrentUser);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    axios
      .get('/auth/me')
      .then((res) => {
        setCurrentUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        clearCurrentUser();
      });
  }, [setCurrentUser, clearCurrentUser]);

  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-2 p-0'>
          <SidebarNav />
        </div>
        <div className='col-10 p-0'>
          <div className='row'>
            <div className='container-fluid'>
              <HeaderNav />
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
