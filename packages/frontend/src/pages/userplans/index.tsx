import '../../styles/pages/userplans.css';
import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner } from 'react-bootstrap';

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
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  return { weekday, month, day };
}

export default function UserPlans() {
  const { toast, error } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const grouped = useMemo(() => groupPlansByDate(plans), [plans]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await axios.get('/plans/me', {
        params: { to: yesterday },
      });
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
      <div className='hist-loading'>
        <Spinner animation='border' variant='warning' />
        <p>Loading your history...</p>
      </div>
    );
  }

  const entries = Object.entries(grouped).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <div className='hist-page'>
      <div className='hist-hero'>
        <h1 className='hist-title'>Meal History</h1>
        <p className='hist-subtitle'>
          {entries.length > 0
            ? `${entries.length} day${entries.length > 1 ? 's' : ''} of meals`
            : 'Your past meals will show up here'}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className='hist-empty'>
          <div className='hist-empty-icon'>📋</div>
          <h3>No meal history yet</h3>
          <p>Save a meal plan and it'll appear here after the day passes</p>
        </div>
      ) : (
        <div className='hist-timeline'>
          {entries.map(([date, meals]) => {
            const { weekday, month, day } = formatDate(date);
            return (
              <div key={date} className='hist-row'>
                <div className='hist-date'>
                  <span className='hist-date-day'>{day}</span>
                  <span className='hist-date-meta'>
                    {weekday}, {month}
                  </span>
                </div>
                <div className='hist-dot'></div>
                <div className='hist-meals'>
                  {MEAL_ORDER.map((type) => {
                    const plan = meals[type];
                    if (!plan) return null;
                    return (
                      <div key={type} className='hist-meal'>
                        <span className='hist-meal-icon'>
                          {MEAL_ICONS[type]}
                        </span>
                        <span className='hist-meal-name'>
                          {plan.meal?.name || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AppToast {...toast} />
    </div>
  );
}
