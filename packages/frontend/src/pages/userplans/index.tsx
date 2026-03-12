import './index.css';
import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axios';
import VideoPreviewModal from '../../components/VideoPreviewModal';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner, Image } from 'react-bootstrap';

const PLACEHOLDER_IMG =
  'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍝',
};

function groupPlansByDate(plans: any[]) {
  const grouped: Record<string, Record<string, any>> = {};
  plans.forEach((p) => {
    const date = p.date;
    const type = p.type?.name?.toLowerCase();
    if (!grouped[date]) grouped[date] = {};
    grouped[date][type] = p;
  });
  return grouped;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function UserPlans() {
  const { toast, error } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const grouped = useMemo(() => groupPlansByDate(plans), [plans]);
  const today = new Date().toISOString().slice(0, 10);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await axios.get('/plans/me');
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      error(err);
    }
    setLoadingPlans(false);
  };

  useEffect(() => {
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadingPlans) {
    return (
      <div className='mp-loading'>
        <Spinner animation='border' variant='warning' />
        <p>Loading your plans...</p>
      </div>
    );
  }

  return (
    <div className='mp-page'>
      <div className='mp-header'>
        <h1 className='mp-title'>My Plans</h1>
        <p className='mp-subtitle'>Your saved meal history</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className='mp-empty'>
          <div className='mp-empty-icon'>📋</div>
          <h3>No saved plans yet</h3>
          <p>Generate and save a week plan to see it here</p>
        </div>
      ) : (
        <div className='mp-days'>
          {Object.entries(grouped)
            .reverse()
            .map(([date, meals]) => {
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`mp-day ${isToday ? 'mp-day-today' : ''}`}
                >
                  <div className='mp-day-header'>
                    <span className='mp-day-label'>{formatDate(date)}</span>
                    {isToday && <span className='mp-day-badge'>Today</span>}
                  </div>

                  <div className='mp-day-meals'>
                    {MEAL_ORDER.map((type) => {
                      const plan = meals[type];
                      if (!plan) return null;
                      return (
                        <div
                          key={type}
                          className='mp-meal'
                          onClick={() => {
                            if (plan.meal?.videoUrl)
                              setVideoUrl(plan.meal.videoUrl);
                          }}
                        >
                          <div className='mp-meal-img-wrap'>
                            <Image
                              className='mp-meal-img'
                              src={plan.meal?.imageUrl || PLACEHOLDER_IMG}
                              alt={plan.meal?.name}
                            />
                          </div>
                          <div className='mp-meal-info'>
                            <span className='mp-meal-type'>
                              {MEAL_ICONS[type]} {type}
                            </span>
                            <span className='mp-meal-name'>
                              {plan.meal?.name || '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      <AppToast {...toast} />
    </div>
  );
}
