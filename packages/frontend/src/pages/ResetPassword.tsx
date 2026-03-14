import axios from '../utils/axios';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/auth.css';
import AuthLayout from '../components/AuthLayout';
import AuthCard from '../components/AuthCard';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard title='Invalid Link' subtitle='This password reset link is invalid or has expired'>
          <Button className='w-100' onClick={() => navigate('/forgot-password')}>
            Request a new reset link
          </Button>
        </AuthCard>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMsg('Both fields are required');
      return;
    }

    if (password.length < 3 || password.length > 20) {
      setErrorMsg('Password must be between 3 and 20 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      await axios.post('/auth/reset-password', { token, password });

      setSuccessMsg('Password has been reset successfully! Redirecting to sign in...');

      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      let msg = 'Reset failed';
      if (isAxiosError(err)) {
        msg = err.response?.data?.message || err.response?.data?.errorMessage || err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard title='Reset Password' subtitle='Enter your new password'>
        <Form onSubmit={handleSubmit}>
          {errorMsg && <div className='auth-error'>{errorMsg}</div>}

          {successMsg && (
            <div className='auth-success'>{successMsg}</div>
          )}

          <Form.Group className='mb-3'>
            <Form.Label>New Password</Form.Label>
            <Form.Control
              type='password'
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Enter new password'
            />
          </Form.Group>

          <Form.Group className='mb-4'>
            <Form.Label>Confirm Password</Form.Label>
            <Form.Control
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Confirm new password'
            />
          </Form.Group>

          <Button type='submit' className='w-100 mb-3' disabled={loading}>
            {loading ? 'Resetting...' : 'Set New Password'}
          </Button>

          <div className='auth-switch'>
            Remember your password?{' '}
            <span onClick={() => navigate('/signin')}>Sign in</span>
          </div>
        </Form>
      </AuthCard>
    </AuthLayout>
  );
}
