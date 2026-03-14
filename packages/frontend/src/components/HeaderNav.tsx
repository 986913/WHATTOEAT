import Image from 'react-bootstrap/Image';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

interface HeaderNavProps {
  onLogout: () => void;
  onMenuToggle?: () => void;
}

export default function HeaderNav({ onLogout, onMenuToggle }: HeaderNavProps) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();

  return (
    <header className='app-header'>
      <button className='app-header-menu' onClick={onMenuToggle}>
        <i className='fa-solid fa-bars'></i>
      </button>
      <div className='app-header-right'>
        <span className='app-header-name'>{currentUser?.username}</span>

        <Image
          src={
            currentUser?.profile?.photo ||
            'https://i.pinimg.com/736x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg'
          }
          roundedCircle
          className='app-header-avatar'
          onClick={() => navigate('/home/profile')}
          title='My Profile'
        />

        <button className='app-header-logout' onClick={onLogout} title='Logout'>
          <i className='fa-solid fa-right-from-bracket'></i>
        </button>
      </div>
    </header>
  );
}
