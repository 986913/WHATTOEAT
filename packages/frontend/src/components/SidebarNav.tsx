import Nav from 'react-bootstrap/Nav';
import { NavLink } from 'react-router-dom';
import { RoleForUI, useMenuStore } from '../store/useMenuStore';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

export default function SidebarNav() {
  const menus = useMenuStore((state) => state.menus);
  const currUser = useCurrentUserStore((state) => state.currentUser);

  let role = RoleForUI.USER;
  if (currUser?.roles.some((r) => r.roleName === 'admin')) {
    role = RoleForUI.ADMIN;
  }
  const visibleMenus = menus.filter((menu) => menu.roles.includes(role));

  return (
    <Nav className='flex-column bg-dark vh-100 p-3' variant='underline'>
      <h3 className='text-center text-white'>What To Eat</h3>
      {visibleMenus.map((menu) => (
        <Nav.Link
          as={NavLink}
          key={menu.id}
          to={menu.path}
          className='text-white'
        >
          <span className='me-2'>{menu.icon}</span>
          {menu.name}
        </Nav.Link>
      ))}
    </Nav>
  );
}
