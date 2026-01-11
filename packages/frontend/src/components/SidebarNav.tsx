import { NavLink } from 'react-router-dom';
import Nav from 'react-bootstrap/Nav';

export default function SidebarNav() {
  return (
    <Nav className='flex-column'>
      <Nav.Link as={NavLink} to='/home/dashboard'>
        Dashboard
      </Nav.Link>

      <Nav.Link as={NavLink} to='/home/users'>
        Users Management
      </Nav.Link>

      <Nav.Link as={NavLink} to='/home/roles'>
        Roles Management
      </Nav.Link>

      <Nav.Link as={NavLink} to='/home/meuns'>
        Meuns Management
      </Nav.Link>

      <Nav.Link as={NavLink} to='/home/apitest'>
        API Testing
      </Nav.Link>
    </Nav>
  );
}
