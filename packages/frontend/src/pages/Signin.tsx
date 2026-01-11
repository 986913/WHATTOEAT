import '../App.css';
import validator from 'validator';
import axios from '../utils/axios';
import classNames from '../utils/classNames';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';

export default function Signin() {
  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [userPasswordMessage, setUserPasswordMessage] = useState('');

  const handleUsernameInputOnChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const usernameValue = e.target.value;
    setUsername(usernameValue);
    if (!validator.isEmail(usernameValue)) {
      setUsernameMessage('Please enter correct email address');
    } else {
      setUsernameMessage('');
    }
  };

  const handleUserPasswordInputOnChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const userPasswordValue = e.target.value;
    setUserPassword(userPasswordValue);
    if (userPasswordValue !== '' && userPasswordValue.length < 3) {
      setUserPasswordMessage('Password must be longer than 3 characters');
    } else {
      setUserPasswordMessage('');
    }
  };

  const handleSigninClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const res = await axios.post('/auth/signin', {
        username,
        password: userPassword,
      });
      alert('User login succees! : ' + JSON.stringify(res.data));
    } catch (error) {
      console.error('Error sign-in:', error);
    }
  };

  return (
    <div className='container vh-100 d-flex justify-content-center align-items-center'>
      <div className='col-11 col-sm-8 col-lg-6 col-xl-4'>
        <form className='shadow-sm rounded p-4 border'>
          <div className='mb-3'>
            <label htmlFor='exampleInputEmail1' className='form-label'>
              Username
            </label>
            <input
              type='email'
              className={classNames(
                'form-control',
                usernameMessage && 'is-invalid'
              )}
              id='exampleInputEmail1'
              aria-describedby='emailHelp'
              value={username}
              onChange={handleUsernameInputOnChange}
            />
            <div className='invalid-feedback'>{usernameMessage}</div>
          </div>
          <div className='mb-3'>
            <label htmlFor='exampleInputPassword1' className='form-label'>
              Password
            </label>
            <input
              type='password'
              className={classNames(
                'form-control',
                userPasswordMessage && 'is-invalid'
              )}
              id='exampleInputPassword1'
              value={userPassword}
              onChange={handleUserPasswordInputOnChange}
            />
            <div className='invalid-feedback'>{userPasswordMessage}</div>
          </div>
          <div className='mb-3 form-check'>
            <input
              type='checkbox'
              className='form-check-input'
              id='exampleCheck1'
            />
            <label className='form-check-label' htmlFor='exampleCheck1'>
              Remember me
            </label>
          </div>

          <div className='d-flex flex-column align-items-center px-1'>
            <button
              type='submit'
              className='btn btn-primary w-100 mb-2 text-light'
              onClick={handleSigninClick}
            >
              Sign in
            </button>
            <Link
              to='/signup'
              className='w-100 border rounded text-decoration-none text-center'
            >
              <button type='submit' className='btn'>
                Sign up
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
