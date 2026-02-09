import '../App.css';
import axios from '../utils/axios';
import validator from 'validator';
import { isAxiosError } from 'axios';
import classNames from '../utils/classNames';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

export default function Signin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [userPasswordMessage, setUserPasswordMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // =============================
  // Handlers
  // =============================

  const handleUsernameInputOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setUsername(value);

    if (!validator.isEmail(value)) {
      setUsernameMessage('Please enter correct email address');
    } else {
      setUsernameMessage('');
    }
  };

  const handleUserPasswordInputOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setUserPassword(value);

    if (value !== '' && value.length < 3) {
      setUserPasswordMessage('Password must be longer than 3 characters');
    } else {
      setUserPasswordMessage('');
    }
  };

  const handleSigninSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await axios.post('/auth/signin', {
        username,
        password: userPassword,
      });

      // 成功跳转
      navigate('/home/wkplans');
    } catch (err: unknown) {
      let msg = 'Unexpected error occurred';

      if (isAxiosError(err)) {
        msg =
          err.response?.data?.mysqlErrMsg ||
          err.response?.data?.errorMessage ||
          err.message;
      }

      console.error(err);
      setErrorMessage(msg);
      setShowErrorModal(true);
    }
  };

  const closeModal = () => setShowErrorModal(false);

  // =============================
  // UI
  // =============================

  return (
    <>
      <div className='container vh-100 d-flex justify-content-center align-items-center'>
        <div className='col-11 col-sm-8 col-lg-6 col-xl-4'>
          <form
            className='shadow-sm rounded p-4 border bg-white'
            onSubmit={handleSigninSubmit}
          >
            {/* Username */}
            <div className='mb-3'>
              <label className='form-label'>Username</label>

              <input
                type='email'
                className={classNames(
                  'form-control',
                  usernameMessage && 'is-invalid',
                )}
                value={username}
                onChange={handleUsernameInputOnChange}
              />

              <div className='invalid-feedback'>{usernameMessage}</div>
            </div>

            {/* Password */}
            <div className='mb-3'>
              <label className='form-label'>Password</label>

              <input
                type='password'
                className={classNames(
                  'form-control',
                  userPasswordMessage && 'is-invalid',
                )}
                value={userPassword}
                onChange={handleUserPasswordInputOnChange}
              />

              <div className='invalid-feedback'>{userPasswordMessage}</div>
            </div>

            {/* Remember */}
            <div className='mb-3 form-check'>
              <input
                type='checkbox'
                className='form-check-input'
                id='remember'
              />
              <label className='form-check-label' htmlFor='remember'>
                Remember me
              </label>
            </div>

            {/* Buttons */}
            <div className='d-flex flex-column align-items-center px-1'>
              <button
                type='submit'
                className='btn btn-primary w-100 mb-2 text-light'
              >
                Sign in
              </button>

              <Link
                to='/signup'
                className='w-100 border rounded text-decoration-none text-center'
              >
                <button type='button' className='btn w-100'>
                  Sign up
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* =============================
           Error Modal
      ============================= */}

      {showErrorModal && (
        <>
          <div className='modal-backdrop fade show'></div>

          <div
            className='modal fade show'
            tabIndex={-1}
            style={{ display: 'block' }}
          >
            <div className='modal-dialog modal-dialog-centered'>
              <div className='modal-content'>
                <div className='modal-header'>
                  <h5 className='modal-title text-danger'>Sign-in Failed</h5>

                  <button className='btn-close' onClick={closeModal} />
                </div>

                <div className='modal-body'>
                  <p className='mb-0'>{errorMessage}</p>
                </div>

                <div className='modal-footer'>
                  <button className='btn btn-secondary' onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
