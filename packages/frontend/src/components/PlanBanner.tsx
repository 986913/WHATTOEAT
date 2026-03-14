import '../styles/components/PlanBanner.css';
import type { ReactNode } from 'react';

interface PlanBannerProps {
  variant: 'saved' | 'draft';
  title: string;
  description: string;
  actions?: ReactNode;
}

export default function PlanBanner({
  variant,
  title,
  description,
  actions,
}: PlanBannerProps) {
  const icon =
    variant === 'saved'
      ? 'fa-solid fa-circle-check'
      : 'fa-solid fa-wand-magic-sparkles';

  return (
    <div className={`plan-banner plan-banner-${variant}`}>
      <div className='plan-banner-left'>
        <i className={icon}></i>
        <div>
          <div className='plan-banner-title'>{title}</div>
          <div className='plan-banner-desc'>{description}</div>
        </div>
      </div>
      {actions && <div className='plan-banner-actions'>{actions}</div>}
    </div>
  );
}
