import Nav from 'react-bootstrap/Nav';
import { NavLink } from 'react-router-dom';
import { useMenuStore } from '../store/useMenuStore';

export default function SidebarNav() {
  const menus = useMenuStore((state) => state.menus);
  return (
    <Nav className='flex-column bg-dark vh-100 p-3' variant='underline'>
      <h3 className='text-center text-white'>What To Eat</h3>
      {menus.map((menu) => (
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
