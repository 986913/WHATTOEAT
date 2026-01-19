import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import DefaultLayout from './layouts/default';
import Dashboard from './pages/dashboard';
import APITest from './pages/dashboard/APITest';
import Users from './pages/users';
import Roles from './pages/roles';
import Menus from './pages/menus';
import Meals from './pages/meals';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录注册路由 */}
        <Route path='/signin' element={<Signin />} />
        <Route path='/signup' element={<Signup />} />

        {/* 布局路由 */}
        <Route path='/home' element={<DefaultLayout />}>
          {/* 默认跳转: /home -> /home/dashboard */}
          <Route index element={<Navigate to='/home/dashboard' replace />} />

          {/* 已存在的子路由们 */}
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='users' element={<Users />} />
          <Route path='roles' element={<Roles />} />
          <Route path='menus' element={<Menus />} />
          <Route path='meals' element={<Meals />} />
          <Route path='apitest' element={<APITest />} />

          {/* 内部兜底，处理 /home/xxxx 这种不存在的路径 */}
          <Route path='*' element={<Navigate to='/home/dashboard' replace />} />
        </Route>

        {/* 兜底 */}
        <Route path='*' element={<Navigate to='/home' replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
