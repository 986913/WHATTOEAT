import '../App.css';
import { Outlet } from 'react-router-dom';
import SidebarNav from '../components/SidebarNav';
import HeaderNav from '../components/HeaderNav';

export default function DefaultLayout() {
  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-3'>
          <SidebarNav />
        </div>
        <div className='col-9'>
          <div className='row'>
            <div className='container-fluid'>
              <HeaderNav />
              {/* 主题内容 */}
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
