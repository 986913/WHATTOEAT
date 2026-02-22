import './index.css';
import { useState } from 'react';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Button, Spinner } from 'react-bootstrap';
import { useCurrentUserStore } from '../../store/useCurrentUserStore';

type DraftPlan = {
  date: string;
  typeId: number;
  mealId: number;
  mealName?: string;
};

export default function WeekPlans() {
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);

  const isEmptyState = draftPlans.length === 0 && savedPlans.length === 0;

  function getMealType(typeId: number) {
    if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
    if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
    if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
    return { label: 'Unknown', icon: '❓' };
  }

  function groupPlansByDate(plans: any[]) {
    const grouped: Record<string, any[]> = {};
    plans.forEach((p) => {
      if (!grouped[p.date]) grouped[p.date] = [];
      grouped[p.date].push(p);
    });
    return grouped;
  }

  const handleGenerateWeekly = async () => {
    if (!currentUser?.id) {
      error('Please sign in first');
      return;
    }

    try {
      setLoadingPreview(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
      });
      setDraftPlans(res.data.draftPlans || []);
      setSavedPlans([]);
      success('Weekly plan generated 🎲');
    } catch {
      error('Failed to generate weekly plan ❌');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveWeek = async () => {
    if (!currentUser?.id) {
      error('Please sign in first');
      return;
    }
    if (!draftPlans.length) return;

    try {
      setLoadingCommit(true);
      const res = await axios.post('/plans/weekly-commit', {
        plans: draftPlans.map((p) => ({
          date: p.date,
          typeId: p.typeId,
          mealId: p.mealId,
          userId: currentUser.id,
        })),
      });

      setSavedPlans(res.data.plans || []);
      setDraftPlans([]);
      success('Weekly plans saved successfully ✅');
    } catch {
      error('Failed to save weekly plans ❌');
    } finally {
      setLoadingCommit(false);
    }
  };

  return (
    <div className='page'>
      {/* ================= Header ================= */}
      <div className='page-header'>
        {!isEmptyState && (
          <div className='page-actions'>
            <Button
              variant={draftPlans.length ? 'outline-success' : 'success'}
              onClick={handleGenerateWeekly}
              disabled={loadingPreview || loadingCommit}
            >
              {loadingPreview ? (
                <>
                  <Spinner animation='border' size='sm' /> Generating...
                </>
              ) : draftPlans.length ? (
                '🔄 Generate Again'
              ) : (
                '🎲 Generate Weekly Plan'
              )}
            </Button>

            <Button
              variant='primary'
              onClick={handleSaveWeek}
              disabled={!draftPlans.length || loadingCommit}
            >
              {loadingCommit ? (
                <>
                  <Spinner animation='border' size='sm' /> Saving...
                </>
              ) : (
                '💾 Save Weekly Plan'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ================= Welcome / Empty ================= */}
      {isEmptyState && (
        <div className='welcome-card'>
          <div className='welcome-emoji'>🍽️</div>

          <h3 className='welcome-title'>Welcome to What To Eat</h3>

          <p className='welcome-subtitle'>
            Plan your meals for the week in seconds — no more “what should I eat
            today?”
          </p>

          <ul className='welcome-list'>
            <li>🎲 Generate a weekly meal plan</li>
            <li>🧾 See ingredients at a glance</li>
            <li>💾 Save and reuse plans anytime</li>
          </ul>

          <Button
            variant='success'
            size='lg'
            onClick={handleGenerateWeekly}
            disabled={loadingPreview}
          >
            {loadingPreview ? (
              <>
                <Spinner animation='border' size='sm' /> Generating...
              </>
            ) : (
              '🎲 Generate My Weekly Plan'
            )}
          </Button>
        </div>
      )}

      {/* ================= Draft Preview ================= */}
      {draftPlans.length > 0 && (
        <>
          <div className='week-scroll-wrapper'>
            <div className='week-grid'>
              {Object.entries(groupPlansByDate(draftPlans)).map(
                ([date, plans]) => (
                  <div key={date} className='day-card'>
                    <div className='day-header'>{date}</div>

                    <div className='meal-list'>
                      {plans
                        .sort((a, b) => a.typeId - b.typeId)
                        .map((p) => {
                          const t = getMealType(p.typeId);
                          return (
                            <div
                              key={`${p.date}-${p.typeId}`}
                              className='meal-row'
                            >
                              <span className={`meal-badge type-${p.typeId}`}>
                                {t.icon} {t.label}
                              </span>
                              <span className='meal-name'>{p.mealName}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className='week-empty'>
            Preview generated successfully. Click{' '}
            <strong>Save Weekly Meals</strong> to confirm your weekly plan.
          </div>
        </>
      )}

      {/* ================= Saved Result ================= */}
      {savedPlans.length > 0 && (
        <>
          <div className='history-hint'>
            ℹ️ View historical plans in <strong>My Plans</strong>.
          </div>

          <div className='plans-scroll-container'>
            {Object.entries(groupPlansByDate(savedPlans)).map(
              ([date, plans]) => (
                <div key={date} className='day-table-block'>
                  <h5 className='day-title'>📅 {date}</h5>

                  <table className='grouped-table'>
                    <colgroup>
                      <col className='col-type' />
                      <col className='col-meal' />
                      <col className='col-url' />
                      <col className='col-ingredients' />
                    </colgroup>

                    <thead>
                      <tr>
                        <th>Meal Type</th>
                        <th>Meal</th>
                        <th>URL</th>
                        <th>Ingredients</th>
                      </tr>
                    </thead>

                    <tbody>
                      {plans
                        .sort((a, b) => a.type.id - b.type.id)
                        .map((p) => (
                          <tr key={p.id}>
                            <td>{p.type?.name}</td>
                            <td>{p.meal?.name}</td>
                            <td className='url-cell'>
                              {p.meal?.url ? (
                                <a
                                  href={p.meal.url}
                                  target='_blank'
                                  rel='noreferrer'
                                >
                                  🔗
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className='ingredients-cell'>
                              {p.meal?.ingredients?.length
                                ? p.meal.ingredients
                                    .map((i: any) => i.name)
                                    .join(', ')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ),
            )}
          </div>
        </>
      )}

      <AppToast {...toast} onClose={toast.close} />
    </div>
  );
}
