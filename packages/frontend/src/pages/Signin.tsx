import axios from '../utils/axios';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
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

export default function Signin() {
  const navigate = useNavigate();
  const setCurrentUser = useCurrentUserStore((s) => s.setCurrentUser);

  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');

  const [usernameMessage, setUsernameMessage] = useState('');
  const [userPasswordMessage, setUserPasswordMessage] = useState('');

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // -------------------------------------------------
  // Validation
  // -------------------------------------------------

  const validate = () => {
    let ok = true;

    if (!username.trim()) {
      setUsernameMessage('Username is required');
      ok = false;
    } else {
      setUsernameMessage('');
    }

    if (!userPassword.trim()) {
      setUserPasswordMessage('Password is required');
      ok = false;
    } else if (userPassword.length < 3) {
      setUserPasswordMessage('Password must be longer than 3 characters');
      ok = false;
    } else {
      setUserPasswordMessage('');
    }

    return ok;
  };

  // -------------------------------------------------
  // Submit
  // -------------------------------------------------

  const handleSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const user = await axios.post('/auth/signin', {
        username,
        password: userPassword,
      });

      setCurrentUser({
        username: user.data.username,
        avatarUrl: user.data.profile?.photo,
      });

      navigate('/home/wkplans');
    } catch (err: unknown) {
      let msg = 'Unexpected error occurred';

      if (isAxiosError(err)) {
        msg =
          err.response?.data?.mysqlErrMsg ||
          err.response?.data?.errorMessage ||
          err.message;
      }

      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

  // -------------------------------------------------
  // UI
  // -------------------------------------------------

  return (
    <>
      <Container className='vh-100 d-flex align-items-center justify-content-center'>
        <Row className='w-100 justify-content-center'>
          <Col xs={11} sm={8} lg={6} xl={4}>
            <Card className='shadow-sm'>
              <Card.Body>
                <Form onSubmit={handleSigninSubmit}>
                  {/* Username */}
                  <Form.Group className='mb-3'>
                    <Form.Label>Username</Form.Label>

                    <Form.Control
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (usernameMessage) {
                          setUsernameMessage('');
                        }
                      }}
                      isInvalid={!!usernameMessage}
                    />

                    <Form.Control.Feedback type='invalid'>
                      {usernameMessage}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Password */}
                  <Form.Group className='mb-3'>
                    <Form.Label>Password</Form.Label>

                    <Form.Control
                      type='password'
                      value={userPassword}
                      onChange={(e) => {
                        const v = e.target.value;
                        setUserPassword(v);

                        if (!v.trim()) {
                          setUserPasswordMessage('Password is required');
                        } else if (v.length < 3) {
                          setUserPasswordMessage(
                            'Password must be longer than 3 characters',
                          );
                        } else {
                          setUserPasswordMessage('');
                        }
                      }}
                      isInvalid={!!userPasswordMessage}
                    />

                    <Form.Control.Feedback type='invalid'>
                      {userPasswordMessage}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Remember */}
                  <Form.Check
                    type='checkbox'
                    label='Remember me'
                    className='mb-3'
                  />

                  {/* Buttons */}
                  <Button type='submit' className='w-100 mb-2'>
                    Sign in
                  </Button>

                  <Button
                    variant='outline-secondary'
                    className='w-100'
                    onClick={() => navigate('/signup')}
                  >
                    Sign up
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Error Modal */}
      <Modal
        show={showErrorModal}
        onHide={() => setShowErrorModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className='text-danger'>Sign-in Failed</Modal.Title>
        </Modal.Header>

        <Modal.Body>{errorMessage}</Modal.Body>

        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowErrorModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
