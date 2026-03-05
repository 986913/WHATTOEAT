import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='auth-page'>
      <div className='auth-bg-pattern' />
      <div className='auth-bg-overlay' />

      <div className='auth-center'>{children}</div>
    </div>
  );
}
