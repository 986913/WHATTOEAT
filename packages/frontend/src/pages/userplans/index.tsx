import './index.css';
import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axios';

import ConfirmModal from '../../components/ConfirmModal';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';

import { Button, Spinner } from 'react-bootstrap';

/** =========================
 * Helper: group plans by date
 * date -> { breakfast, lunch, dinner }
 ========================= */
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

function isEditable(dateStr: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return dateStr >= todayStr;
}

export default function UserPlans() {
  const { toast, success, error } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  /** ===== expanded state ===== */
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
    {},
  );

  const grouped = useMemo(() => groupPlansByDate(plans), [plans]);

  /** =========================
   * Fetch plans
   ========================= */
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
  }, []);

  /** =========================
   * Default expand today
   ========================= */
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (grouped[today]) {
      setExpandedDates({ [today]: true });
    }
  }, [grouped]);

  /** =========================
   * Toggle day
   ========================= */
  const toggleDate = (date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  /** =========================
   * Delete plan
   ========================= */
  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      await axios.delete(`/plans/${selectedPlan.id}`);
      success('Plan deleted successfully 🗑️');
      setSelectedPlan(null);
      fetchPlans();
    } catch {
      error('Failed to delete plan ❌');
    }
  };

  return (
    <div className='page'>
      <h2 className='page-title'>My Plans</h2>

      <div className='plans-layout'>
        <div className='plans-left'>
          {loadingPlans ? (
            <div className='loading-box'>
              <Spinner animation='border' size='sm' /> Loading plans...
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className='table-empty'>No Plans Found</div>
          ) : (
            Object.entries(grouped)
              .reverse()
              .map(([date, meals]) => {
                const expanded = expandedDates[date];
                return (
                  <div key={date} className='day-card'>
                    {/* ===== Header ===== */}
                    <div
                      className='day-header clickable'
                      onClick={() => toggleDate(date)}
                    >
                      <span>📅 {date}</span>
                      <span className='chevron'>{expanded ? '▲' : '▼'}</span>
                    </div>

                    {/* ===== Body ===== */}
                    {expanded && (
                      <div className='day-body'>
                        {['breakfast', 'lunch', 'dinner'].map((type) => {
                          const plan = meals[type];
                          const editable = plan && isEditable(plan.date);

                          return (
                            <div key={type} className='meal-row'>
                              <div className='meal-type'>
                                {type === 'breakfast' && '🍳'}
                                {type === 'lunch' && '🥗'}
                                {type === 'dinner' && '🍖'} {type}
                              </div>

                              <div className='meal-info'>
                                {plan ? (
                                  <>
                                    <div className='meal-title'>
                                      <span className='meal-name'>
                                        {plan.meal?.name}
                                      </span>

                                      {plan.meal?.url && (
                                        <a
                                          href={plan.meal.url}
                                          target='_blank'
                                          rel='noreferrer'
                                          className='meal-link'
                                        >
                                          🔗
                                        </a>
                                      )}
                                    </div>

                                    {plan.meal?.ingredients?.length > 0 && (
                                      <div className='ingredient-list'>
                                        {plan.meal.ingredients.map(
                                          (ing: any) => (
                                            <span
                                              key={ing.id}
                                              className='ingredient-chip'
                                            >
                                              {ing.name}
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className='missing'>—</span>
                                )}
                              </div>

                              <div className='meal-actions'>
                                <Button size='sm' disabled={!editable}>
                                  Replace it
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* ===== Delete Confirm ===== */}
      <ConfirmModal
        show={!!selectedPlan}
        title='Delete Plan'
        message='Are you sure you want to delete this plan?'
        onCancel={() => setSelectedPlan(null)}
        onConfirm={handleDeletePlan}
      />

      {/* ===== Toast ===== */}
      <AppToast
        show={toast.show}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        onClose={toast.close}
      />
    </div>
  );
}
