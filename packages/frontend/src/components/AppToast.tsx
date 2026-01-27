import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

export default function AppToast({
  show,
  title,
  message,
  variant = 'success',
  onClose,
}: {
  show: boolean;
  title: string;
  message: string;
  variant?: 'success' | 'danger' | 'info';
  onClose: () => void;
}) {
  return (
    <ToastContainer position='bottom-end' className='p-3'>
      <Toast show={show} onClose={onClose} delay={2500} autohide bg={variant}>
        <Toast.Header>
          <strong className='me-auto'>{title}</strong>
        </Toast.Header>

        <Toast.Body>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
