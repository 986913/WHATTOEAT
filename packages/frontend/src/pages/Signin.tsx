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

export default function Signin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username and password are required');
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post('/auth/signin', {
        username,
        password,
      });

      localStorage.setItem('access_token', res.data.access_token);

      navigate('/home/wkplans');
    } catch (err) {
      let msg = 'Sign in failed';

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
      <AuthCard title='WhatToEat' subtitle='Plan your meals effortlessly'>
        <Form onSubmit={handleSubmit}>
          {errorMsg && <div className='auth-error'>{errorMsg}</div>}

          <Form.Group className='mb-3'>
            <Form.Label>Username</Form.Label>

            <Form.Control
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Group>

          <Form.Group className='mb-4'>
            <Form.Label>Password</Form.Label>

            <Form.Control
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>

          <Button type='submit' className='w-100 mb-3' disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
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
            Don't have an account?{' '}
            <span onClick={() => navigate('/signup')}>Sign up</span>
          </div>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
