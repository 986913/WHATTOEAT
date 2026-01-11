import Navbar from 'react-bootstrap/Navbar';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';

export default function HeaderNav() {
  return (
    <Navbar expand='lg' className='bg-body-tertiary pt-2 pb-2 border'>
      <Container>
        <i className='fa-solid fa-bars'></i>
        <Navbar.Brand> What To Eat </Navbar.Brand>
        <Image
          src='https://img.freepik.com/premium-vector/german-shepherd-dog-mascot-logo-illustration_164904-4.jpg'
          roundedCircle
          // thumbnail
          style={{ width: 50, height: 50 }}
        />
      </Container>
    </Navbar>
  );
}
