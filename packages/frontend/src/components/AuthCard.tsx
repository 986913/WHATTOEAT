import React from 'react';
import Card from 'react-bootstrap/Card';

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className='auth-card'>
      <Card.Body>
        <div className='auth-header'>
          <div className='auth-logo'>🍽</div>

          <h2 className='auth-title'>{title}</h2>

          {subtitle && <p className='auth-subtitle'>{subtitle}</p>}
        </div>

        {children}
      </Card.Body>
    </Card>
  );
}
