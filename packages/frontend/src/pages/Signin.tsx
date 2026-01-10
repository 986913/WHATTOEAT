import { Link } from 'react-router-dom';
import '../App.css';

export default function Signin() {
  return (
    <div className='container vh-100 d-flex justify-content-center align-items-center'>
      <div className='col-4'>
        <form className='shadow-sm rounded p-4 border'>
          <div className='mb-3'>
            <label htmlFor='exampleInputEmail1' className='form-label'>
              User name
            </label>
            <input
              type='email'
              className='form-control'
              id='exampleInputEmail1'
              aria-describedby='emailHelp'
            />
          </div>
          <div className='mb-3'>
            <label htmlFor='exampleInputPassword1' className='form-label'>
              Password
            </label>
            <input
              type='password'
              className='form-control'
              id='exampleInputPassword1'
            />
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
