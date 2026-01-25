import { ReactNode } from 'react';

export default function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className='page-header'>
      <h3 className='page-title'>{title}</h3>
      {action}
    </div>
  );
}
