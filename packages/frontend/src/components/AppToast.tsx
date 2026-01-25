import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

export default function AppToast({
  show,
  message,
  onClose,
}: {
  show: boolean;
  message: string;
  onClose: () => void;
}) {
  return (
    <ToastContainer position='top-end' className='p-3'>
      <Toast show={show} onClose={onClose} delay={2500} autohide>
        <Toast.Header>
          <strong className='me-auto'>Success</strong>
        </Toast.Header>
        <Toast.Body>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
