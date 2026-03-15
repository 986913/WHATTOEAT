import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GoogleCallback from './pages/GoogleCallback';
import DefaultLayout from './layouts/default';
import Dashboard from './pages/dashboard';
import Users from './pages/users';
import Roles from './pages/roles';
import Menus from './pages/menus';
import Meals from './pages/meals';
import Plans from './pages/plans';
import Ingredients from './pages/ingredients';
import WeekPlans from './pages/weekplans';
import UserPlans from './pages/userplans';
import Profile from './pages/profile';
import Feedback from './pages/feedback';
import MyMeals from './pages/mymeals';
import Today from './pages/today';
import './styles/base.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 登录注册路由 */}
        <Route path='/signin' element={<Signin />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/auth/google/callback' element={<GoogleCallback />} />

        {/* 布局路由 */}
        <Route path='/home' element={<DefaultLayout />}>
          {/* 默认跳转: /home -> /home/today */}
          <Route index element={<Navigate to='/home/today' replace />} />

          {/* 核心页面 */}
          <Route path='today' element={<Today />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='users' element={<Users />} />
          <Route path='roles' element={<Roles />} />
          <Route path='menus' element={<Menus />} />
          <Route path='meals' element={<Meals />} />
          <Route path='ingredients' element={<Ingredients />} />
          <Route path='plans' element={<Plans />} />
          <Route path='userplans' element={<UserPlans />} />
          <Route path='wkplans' element={<WeekPlans />} />
          <Route path='profile' element={<Profile />} />
          <Route path='feedback' element={<Feedback />} />
          <Route path='mymeals' element={<MyMeals />} />

          {/* 内部兜底，处理 /home/xxxx 这种不存在的路径 */}
          <Route path='*' element={<Navigate to='/home/today' replace />} />
        </Route>

        {/* 兜底 */}
        <Route path='*' element={<Navigate to='/home' replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
