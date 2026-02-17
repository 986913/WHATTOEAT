import Navbar from 'react-bootstrap/Navbar';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

interface HeaderNavProps {
  onLogout: () => void;
}

export default function HeaderNav({ onLogout }: HeaderNavProps) {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  return (
    <Navbar expand='lg' className='bg-body-tertiary pt-2 pb-2 border'>
      <Container fluid>
        {/* 左侧 */}
        <div className='d-flex align-items-center gap-3'>
          <i className='fa-solid fa-bars'></i>
          <Navbar.Brand className='mb-0'>What To Eat</Navbar.Brand>
        </div>

        {/* 右侧用户区域 */}
        <div className='d-flex align-items-center gap-3 ms-auto'>
          <span className='fw-medium'>{currentUser?.username}</span>

          <Image
            src={
              currentUser?.profile?.photo ||
              'https://i.pinimg.com/736x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg'
            }
            roundedCircle
            style={{ width: 42, height: 42, objectFit: 'cover' }}
          />

          <Button variant='outline-danger' size='sm' onClick={onLogout}>
            Logout
          </Button>
        </div>
      </Container>
    </Navbar>
  );
}
