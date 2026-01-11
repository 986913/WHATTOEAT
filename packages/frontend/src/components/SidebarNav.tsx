import Nav from 'react-bootstrap/Nav';
import { NavLink } from 'react-router-dom';
import { useMenuStore } from '../store/useMenuStore';

export default function SidebarNav() {
  const menus = useMenuStore((state) => state.menus);
  return (
    <Nav className='flex-column'>
      {menus.map((menu) => (
        <Nav.Link as={NavLink} key={menu.id} to={menu.path}>
          {menu.name}
        </Nav.Link>
      ))}
    </Nav>
  );
}
