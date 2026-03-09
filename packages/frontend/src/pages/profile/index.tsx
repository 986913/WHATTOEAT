import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Button,
  Image,
  Alert,
  Spinner,
  Row,
  Col,
} from 'react-bootstrap';
import axios from '../../utils/axios';
import { useCurrentUserStore } from '../../store/useCurrentUserStore';

const PLACEHOLDER_PHOTO =
  'https://i.pinimg.com/736x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg';

export default function Profile() {
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState('');
  const [gender, setGender] = useState<'1' | '2'>('1');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'danger';
    text: string;
  } | null>(null);

  // 初始化表单
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setPhoto(currentUser.profile?.photo || '');
      setGender((currentUser.profile?.gender as '1' | '2') || '1');
      setAddress(currentUser.profile?.address || '');
    }
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!currentUser) return;

    // 密码校验（与 Signup 保持一致）
    if (password) {
      if (password.length < 3) {
        setMessage({ type: 'danger', text: 'Password must be at least 3 characters' });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: 'danger', text: 'Passwords do not match' });
        return;
      }
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        username,
        profile: { gender, address, ...(photo ? { photo } : {}) },
      };
      if (password) {
        payload.password = password;
      }

      await axios.put(`/users/${currentUser.id}`, payload);

      // 更新 store 中的用户信息
      setCurrentUser({
        ...currentUser,
        username,
        profile: {
          ...currentUser.profile,
          gender,
          address,
          photo,
        },
      });

      setPassword('');
      setConfirmPassword('');
      setMessage({
        type: 'success',
        text: 'Personal information updated successfully!',
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Update failed. Please try again later.';
      setMessage({
        type: 'danger',
        text: Array.isArray(msg) ? msg.join(', ') : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className='text-center mt-5'>
        <Spinner animation='border' />
      </div>
    );
  }

  return (
    <div className='d-flex justify-content-center'>
      <Card style={{ width: '100%', maxWidth: 560 }}>
        <Card.Header as='h5'>My Profile</Card.Header>
        <Card.Body>
          {message && (
            <Alert
              variant={message.type}
              dismissible
              onClose={() => setMessage(null)}
            >
              {message.text}
            </Alert>
          )}

          {/* Avatar preview */}
          <div className='text-center mb-4'>
            <Image
              src={photo || PLACEHOLDER_PHOTO}
              roundedCircle
              style={{
                width: 100,
                height: 100,
                objectFit: 'cover',
                border: '3px solid #dee2e6',
              }}
            />
          </div>

          <Form>
            {/* Username */}
            <Form.Group className='mb-3'>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>

            {/* Password */}
            <Row className='mb-3'>
              <Col>
                <Form.Group>
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Leave blank to keep current'
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type='password'
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder='Confirm new password'
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Photo URL */}
            <Form.Group className='mb-3'>
              <Form.Label>Photo URL</Form.Label>
              <Form.Control
                type='text'
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder='https://example.com/avatar.jpg'
              />
            </Form.Group>

            {/* Gender */}
            <Form.Group className='mb-3'>
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

            {/* Address */}
            <Form.Group className='mb-3'>
              <Form.Label>Address</Form.Label>
              <Form.Control
                type='text'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Form.Group>

            {/* Roles (read-only) */}
            <Form.Group className='mb-3'>
              <Form.Label>Roles</Form.Label>
              <div>
                {currentUser.roles.map((r) => (
                  <span key={r.id} className='badge bg-secondary me-1'>
                    {r.roleName}
                  </span>
                ))}
              </div>
              <Form.Text className='text-muted'>
                Roles can only be changed by admin
              </Form.Text>
            </Form.Group>

            <div className='d-grid'>
              <Button
                variant='primary'
                onClick={handleSubmit}
                disabled={loading || !username.trim()}
              >
                {loading ? (
                  <Spinner animation='border' size='sm' />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
