import '../../styles/pages/today.css';
import { Card } from 'react-bootstrap';
import ContributeContent from '../../components/ContributeContent';

export default function Contribute() {
  return (
    <div className='d-flex justify-content-center' style={{ paddingTop: 20 }}>
      <Card style={{ width: '100%', maxWidth: 520, borderRadius: 12 }}>
        <Card.Body className='text-center'>
          <ContributeContent />
        </Card.Body>
      </Card>
    </div>
  );
}
