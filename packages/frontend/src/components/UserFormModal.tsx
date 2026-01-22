import { Modal, Button, Form } from 'react-bootstrap';

interface UserFormModalProps {
  show: boolean;
  title: string;
  submitText: string;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitDisabled?: boolean;

  // 表单状态（由父组件控制）
  username: string;
  setUsername: (v: string) => void;

  password?: string;
  setPassword?: (v: string) => void;
  showPassword?: boolean; // 👈 控制 Create / Edit 是否显示

  gender: '1' | '2';
  setGender: (v: '1' | '2') => void;

  roles: string[];
  toggleRole: (roleId: string) => void;

  photo: string;
  setPhoto: (v: string) => void;

  address: string;
  setAddress: (v: string) => void;
}

export default function UserFormModal({
  show,
  title,
  submitText,
  onClose,
  onSubmit,
  isSubmitDisabled,
  username,
  setUsername,
  password,
  setPassword,
  showPassword = false,
  gender,
  setGender,
  roles,
  toggleRole,
  photo,
  setPhoto,
  address,
  setAddress,
}: UserFormModalProps) {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {/* Username */}
          <Form.Group className='mb-2'>
            <Form.Label>Username</Form.Label>
            <Form.Control
              type='text'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Group>

          {/* Password（仅 Create 显示） */}
          {showPassword && setPassword && (
            <Form.Group className='mb-2'>
              <Form.Label>Password</Form.Label>
              <Form.Control
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='Enter password'
              />
            </Form.Group>
          )}

          {/* Gender */}
          <Form.Group className='mb-2'>
            <Form.Label>Gender</Form.Label>
            <div>
              <Form.Check
                inline
                type='radio'
                label='Female'
                checked={gender === '1'}
                onChange={() => setGender('1')}
              />
              <Form.Check
                inline
                type='radio'
                label='Male'
                checked={gender === '2'}
                onChange={() => setGender('2')}
              />
            </div>
          </Form.Group>

          {/* Roles */}
          <Form.Group className='mb-2'>
            <Form.Label>Roles</Form.Label>
            <div>
              <Form.Check
                inline
                type='checkbox'
                label='Write'
                checked={roles.includes('2')}
                onChange={() => toggleRole('2')}
              />
              <Form.Check
                inline
                type='checkbox'
                label='ReadOnly'
                checked={roles.includes('3')}
                onChange={() => toggleRole('3')}
              />
            </div>
          </Form.Group>

          {/* Photo */}
          <Form.Group className='mb-2'>
            <Form.Label>Photo URL</Form.Label>
            <Form.Control
              type='text'
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
            />
          </Form.Group>

          {/* Address */}
          <Form.Group className='mb-2'>
            <Form.Label>Address</Form.Label>
            <Form.Control
              type='text'
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant='primary'
          onClick={onSubmit}
          disabled={isSubmitDisabled}
        >
          {submitText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
