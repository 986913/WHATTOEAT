import Navbar from 'react-bootstrap/Navbar';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import { useCurrentUserStore } from '../store/useCurrentUserStore';

export default function HeaderNav() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  return (
    <Navbar expand='lg' className='bg-body-tertiary pt-2 pb-2 border'>
      <Container>
        <i className='fa-solid fa-bars'></i>
        <Navbar.Brand> What To Eat </Navbar.Brand>
        <Image
          src={
            currentUser?.profile?.photo ||
            'https://i.pinimg.com/736x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg'
          }
          roundedCircle
          style={{ width: 50, height: 50 }}
        />
      </Container>
    </Navbar>
  );
}
