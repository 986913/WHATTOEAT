import axios from '../utils/axios';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import { API_BASE_URL } from '../config/api';
import AuthLayout from '../components/AuthLayout';
import AuthCard from '../components/AuthCard';
import { GoogleIcon } from '../components/GoogleIcon';

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Username required');
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('A valid email is required');
      return;
    }

    if (password.length < 3) {
      setErrorMsg('Password must be at least 3 characters');
      return;
    }

    if (confirm !== password) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      await axios.post('/auth/signup', {
        username,
        password,
        email,
      });

      //auto signin after success signup
      const res = await axios.post('/auth/signin', {
        username,
        password,
      });
      localStorage.setItem('access_token', res.data.access_token);
      navigate('/home/today');
    } catch (err) {
      let msg = 'Signup failed';

      if (isAxiosError(err)) {
        msg = err.response?.data?.errorMessage || err.message;
      }

      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title='Create Account' subtitle='Start planning your meals'>
        <Form onSubmit={handleSubmit}>
          {errorMsg && <div className='auth-error'>{errorMsg}</div>}

          <Form.Group className='mb-3'>
            <Form.Label>Username</Form.Label>

            <Form.Control
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Group>

          <Form.Group className='mb-3'>
            <Form.Label>Email</Form.Label>

            <Form.Control
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='your@email.com'
            />
          </Form.Group>

          <Form.Group className='mb-3'>
            <Form.Label>Password</Form.Label>

            <Form.Control
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Form.Group className='mb-4'>
            <Form.Label>Confirm Password</Form.Label>

            <Form.Control
              type='password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Form.Group>

          <Button type='submit' className='w-100 mb-3' disabled={loading}>
            {loading ? 'Creating...' : 'Create account'}
          </Button>

          <div className='auth-divider'>
            <span>or</span>
          </div>

          <Button
            variant='outline-dark'
            className='w-100 mb-3 google-btn'
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className='auth-switch'>
            Already have an account?{' '}
            <span onClick={() => navigate('/signin')}>Sign in</span>
          </div>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
