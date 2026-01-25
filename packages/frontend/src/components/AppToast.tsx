import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

export default function AppToast({
  show,
  message,
  variant = 'success',
  onClose,
}: {
  show: boolean;
  message: string;
  variant?: 'success' | 'danger' | 'info';
  onClose: () => void;
}) {
  return (
    <ToastContainer position='top-end' className='p-3'>
      <Toast show={show} onClose={onClose} delay={2500} autohide>
        <Toast.Header>
          <strong className='me-auto'>
            {variant === 'success'
              ? 'Success'
              : variant === 'danger'
                ? 'Error'
                : 'Info'}
          </strong>
        </Toast.Header>

        <Toast.Body>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
