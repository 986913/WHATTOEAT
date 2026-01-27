import './index.css';
import { useState } from 'react';
import axios from '../../utils/axios';

import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';

import { Button, Spinner } from 'react-bootstrap';

type DraftPlan = {
  date: string;
  typeId: number;
  mealId: number;
  mealName?: string;
};

function getMealType(typeId: number) {
  if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
  if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
  if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
  return { label: 'Unknown', icon: '❓' };
}

function groupByDate(plans: DraftPlan[]) {
  const grouped: Record<string, DraftPlan[]> = {};
  plans.forEach((p) => {
    if (!grouped[p.date]) grouped[p.date] = [];
    grouped[p.date].push(p);
  });
  return grouped;
}

export default function WeekPlans() {
  const { toast, success, error } = useToast();

  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerateWeekly = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/plans/weekly-preview', { userId: 1 });
      setDraftPlans(res.data.draftPlans || []);
      success('Weekly plan generated 🎲');
    } catch (err) {
      error('Failed to generate weekly plan ❌');
    } finally {
      setLoading(false);
    }
  };

  const grouped = groupByDate(draftPlans);

  return (
    <div className='page'>
      {/* ================= Header ================= */}
      <div className='page-header'>
        <h2 className='page-title'>Weekly Meal Planner</h2>

        <div className='week-actions'>
          <Button
            variant='success'
            onClick={handleGenerateWeekly}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation='border' size='sm' /> Generating...
              </>
            ) : (
              '🎲 Random Generate'
            )}
          </Button>

          <Button
            variant='primary'
            disabled={draftPlans.length === 0}
            onClick={() => {
              // 现在只占位
              success('Save week clicked (backend later)');
            }}
          >
            💾 Save Week Meals
          </Button>
        </div>
      </div>

      {/* ================= Empty ================= */}
      {draftPlans.length === 0 && (
        <div className='week-empty'>
          No weekly plan yet. Click <strong>Random Generate</strong> to preview.
        </div>
      )}

      {/* ================= Weekly Grid ================= */}
      <div className='week-scroll-wrapper'>
        <div className='week-grid'>
          {Object.entries(grouped).map(([date, plans]) => (
            <div key={date} className='day-card'>
              <div className='day-header'>
                <span className='day-date'>{date}</span>
              </div>

              <div className='meal-list'>
                {plans
                  .sort((a, b) => a.typeId - b.typeId)
                  .map((p) => {
                    const mealType = getMealType(p.typeId);

                    return (
                      <div key={`${p.date}-${p.typeId}`} className='meal-row'>
                        <span className={`meal-badge type-${p.typeId}`}>
                          {mealType.icon} {mealType.label}
                        </span>
                        <span className='meal-name'>
                          {p.mealName ?? `Meal ID: ${p.mealId}`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AppToast {...toast} onClose={toast.close} />
    </div>
  );
}
