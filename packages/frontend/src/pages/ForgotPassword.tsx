import axios from '../utils/axios';
import { isAxiosError } from 'axios';
import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';
import AuthLayout from '../components/AuthLayout';
import AuthCard from '../components/AuthCard';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Username is required');
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post('/auth/forgot-password', { username });

      // 开发阶段: 如果返回了 resetToken，直接跳转到重置页面
      if (res.data.resetToken) {
        navigate(`/reset-password?token=${res.data.resetToken}`);
        return;
      }

      setSuccessMsg(res.data.message);
    } catch (err) {
      let msg = 'Request failed';
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
      <AuthCard title='Forgot Password' subtitle='Enter your username to reset your password'>
        <Form onSubmit={handleSubmit}>
          {errorMsg && <div className='auth-error'>{errorMsg}</div>}

          {successMsg && (
            <div className='auth-success'>{successMsg}</div>
          )}

          <Form.Group className='mb-4'>
            <Form.Label>Username</Form.Label>
            <Form.Control
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder='Enter your username'
            />
          </Form.Group>

          <Button type='submit' className='w-100 mb-3' disabled={loading}>
            {loading ? 'Sending...' : 'Reset Password'}
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
