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

  const userMenus = menus.filter(
    (m) => m.roles.includes(role) && m.id < 10,
  );
  const adminMenus = menus.filter(
    (m) => m.roles.includes(role) && m.id >= 10,
  );

  return (
    <div className='sidebar'>
      {/* Brand */}
      <div className='sidebar-brand'>
        <span className='sidebar-brand-icon'>🎲</span>
        <span className='sidebar-brand-text'>MealDice</span>
      </div>

      {/* User nav */}
      <Nav className='flex-column sidebar-nav-section'>
        {userMenus.map((menu) => (
          <Nav.Link
            as={NavLink}
            key={menu.id}
            to={menu.path}
            className='sidebar-link'
          >
            <span className='sidebar-link-icon'>{menu.icon}</span>
            <span className='sidebar-link-text'>{menu.name}</span>
          </Nav.Link>
        ))}
      </Nav>

      {/* Extras */}
      <div className='sidebar-divider' />
      <Nav className='flex-column sidebar-nav-section'>
        <Nav.Link as={NavLink} to='/home/contribute' className='sidebar-link'>
          <span className='sidebar-link-icon'>
            <i className='fa-solid fa-plus'></i>
          </span>
          <span className='sidebar-link-text'>Add Your Meal</span>
        </Nav.Link>
        <Nav.Link as={NavLink} to='/home/feedback' className='sidebar-link'>
          <span className='sidebar-link-icon'>
            <i className='fa-regular fa-comment-dots'></i>
          </span>
          <span className='sidebar-link-text'>Feedback</span>
        </Nav.Link>
      </Nav>

      {/* Admin section */}
      {adminMenus.length > 0 && (
        <>
          <div className='sidebar-divider' />
          <div className='sidebar-section-label'>Admin</div>
          <Nav className='flex-column sidebar-nav-section'>
            {adminMenus.map((menu) => (
              <Nav.Link
                as={NavLink}
                key={menu.id}
                to={menu.path}
                className='sidebar-link'
              >
                <span className='sidebar-link-icon'>{menu.icon}</span>
                <span className='sidebar-link-text'>{menu.name}</span>
              </Nav.Link>
            ))}
          </Nav>
        </>
      )}
    </div>
  );
}
