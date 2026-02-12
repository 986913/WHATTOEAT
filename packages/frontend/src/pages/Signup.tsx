import axios from '../utils/axios';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUserStore } from '../store/useCurrentUserStore';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Modal,
  Card,
} from 'react-bootstrap';

export default function Signup() {
  const navigate = useNavigate();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [usernameMsg, setUsernameMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  // -----------------------
  // Validation
  // -----------------------

  const validate = () => {
    let ok = true;

    if (!username.trim()) {
      setUsernameMsg('Username required');
      ok = false;
    } else {
      setUsernameMsg('');
    }

    if (password.length < 3) {
      setPasswordMsg('Password must be at least 3 chars');
      ok = false;
    } else {
      setPasswordMsg('');
    }

    if (confirmPassword !== password) {
      setConfirmMsg('Passwords do not match');
      ok = false;
    } else {
      setConfirmMsg('');
    }

    return ok;
  };

  // -----------------------
  // Submit
  // -----------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const user = await axios.post('/auth/signup', {
        username,
        password,
      });

      setCurrentUser({
        username: user.data.username,
        avatarUrl: user.data.profile?.photo,
      });

      // 成功 → 去首页
      navigate('/home/wkplans');
    } catch (err: unknown) {
      let msg = 'Signup failed';

      if (isAxiosError(err)) {
        msg =
          err.response?.data?.mysqlErrMsg ||
          err.response?.data?.errorMessage ||
          err.message;
      }

      setErrorMessage(msg);
      setShowModal(true);
    }
  };

  // -----------------------
  // UI
  // -----------------------

  return (
    <>
      <Container className='vh-100 d-flex align-items-center justify-content-center'>
        <Row className='w-100 justify-content-center'>
          <Col xs={11} sm={8} lg={6} xl={4}>
            <Card className='shadow-sm'>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  {/* Username */}
                  <Form.Group className='mb-3'>
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      isInvalid={!!usernameMsg}
                    />
                    <Form.Control.Feedback type='invalid'>
                      {usernameMsg}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className='mb-3'>
                    <Form.Label>Create Password</Form.Label>
                    <Form.Control
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      isInvalid={!!passwordMsg}
                    />
                    <Form.Control.Feedback type='invalid'>
                      {passwordMsg}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Confirm */}
                  <Form.Group className='mb-3'>
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type='password'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      isInvalid={!!confirmMsg}
                    />
                    <Form.Control.Feedback type='invalid'>
                      {confirmMsg}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Submit */}
                  <Button type='submit' className='w-100 mb-2'>
                    Create Account
                  </Button>

                  <Button
                    variant='outline-secondary'
                    className='w-100'
                    onClick={() => navigate('/signin')}
                  >
                    Back to Sign in
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Error Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className='text-danger'>Signup Failed</Modal.Title>
        </Modal.Header>

        <Modal.Body>{errorMessage}</Modal.Body>

        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
