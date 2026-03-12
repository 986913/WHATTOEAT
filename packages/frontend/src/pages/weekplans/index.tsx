import './index.css';
import { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner, Image } from 'react-bootstrap';
import { useCurrentUserStore } from '../../store/useCurrentUserStore';
import VideoPreviewModal from '../../components/VideoPreviewModal';

type DraftPlan = {
  date: string;
  typeId: number;
  mealId: number;
  mealName?: string;
  mealVideoUrl?: string;
  mealImageUrl?: string;
};

const PLACEHOLDER_IMG =
  'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png';

function getMealType(typeId: number) {
  if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
  if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
  if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
  return { label: 'Unknown', icon: '❓' };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function groupPlansByDate(plans: DraftPlan[]) {
  const grouped: Record<string, DraftPlan[]> = {};
  plans.forEach((p) => {
    if (!grouped[p.date]) grouped[p.date] = [];
    grouped[p.date].push(p);
  });
  return grouped;
}

export default function WeekPlans() {
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  // Auto-generate on load
  useEffect(() => {
    if (currentUser?.id && draftPlans.length === 0) {
      handleGenerateWeekly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleGenerateWeekly = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingPreview(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
      });
      setDraftPlans(res.data.draftPlans || []);
    } catch {
      error('Failed to generate weekly plan');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveWeek = async () => {
    if (!currentUser?.id || !draftPlans.length) return;
    try {
      setLoadingCommit(true);
      await axios.post('/plans/weekly-commit', {
        plans: draftPlans.map((p) => ({
          date: p.date,
          typeId: p.typeId,
          mealId: p.mealId,
          userId: currentUser.id,
        })),
      });
      success('Week saved!');
    } catch {
      error('Failed to save weekly plans');
    } finally {
      setLoadingCommit(false);
    }
  };

  const handleReplaceMeal = async (
    date: string,
    typeId: number,
    currentMealId: number,
  ) => {
    const key = `${date}-${typeId}`;
    try {
      setReplacingKey(key);
      const res = await axios.post('/plans/replace-meal', {
        typeId,
        excludeMealId: currentMealId,
      });
      setDraftPlans((prev) =>
        prev.map((p) =>
          p.date === date && p.typeId === typeId
            ? {
                ...p,
                mealId: res.data.mealId,
                mealName: res.data.mealName,
                mealVideoUrl: res.data.mealVideoUrl,
                mealImageUrl: res.data.mealImageUrl,
              }
            : p,
        ),
      );
    } catch {
      error('No other meals available for this type');
    } finally {
      setReplacingKey(null);
    }
  };

  const grouped = groupPlansByDate(draftPlans);

  // Loading
  if (loadingPreview && draftPlans.length === 0) {
    return (
      <div className='wk-loading'>
        <div className='wk-loading-icon'>📅</div>
        <p>Generating your week...</p>
        <Spinner animation='border' variant='warning' />
      </div>
    );
  }

  return (
    <div className='wk-page'>
      {/* Header */}
      <div className='wk-header'>
        <div>
          <h1 className='wk-title'>Your Week</h1>
          <p className='wk-subtitle'>
            Review, adjust, and save your meal plan
          </p>
        </div>
        <div className='wk-actions'>
          <button
            className='wk-btn-outline'
            onClick={handleGenerateWeekly}
            disabled={loadingPreview || loadingCommit}
          >
            {loadingPreview ? (
              <>
                <Spinner animation='border' size='sm' /> Generating...
              </>
            ) : (
              <>
                <i className='fa-solid fa-shuffle'></i> Regenerate
              </>
            )}
          </button>
          <button
            className='wk-btn-primary'
            onClick={handleSaveWeek}
            disabled={!draftPlans.length || loadingCommit}
          >
            {loadingCommit ? (
              <>
                <Spinner animation='border' size='sm' /> Saving...
              </>
            ) : (
              'Save Week'
            )}
          </button>
        </div>
      </div>

      {/* Days */}
      <div className='wk-days'>
        {Object.entries(grouped).map(([date, plans]) => {
          const isToday = date === today;
          return (
            <div
              key={date}
              className={`wk-day ${isToday ? 'wk-day-today' : ''}`}
            >
              <div className='wk-day-header'>
                <span className='wk-day-label'>{formatDate(date)}</span>
                {isToday && <span className='wk-day-badge'>Today</span>}
              </div>
              <div className='wk-day-meals'>
                {plans
                  .sort((a, b) => a.typeId - b.typeId)
                  .map((p) => {
                    const t = getMealType(p.typeId);
                    const key = `${p.date}-${p.typeId}`;
                    const isReplacing = replacingKey === key;

                    return (
                      <div
                        key={key}
                        className={`wk-meal ${isReplacing ? 'wk-meal-replacing' : ''}`}
                      >
                        <div
                          className='wk-meal-img-wrap'
                          onClick={() => {
                            if (p.mealVideoUrl) setVideoUrl(p.mealVideoUrl);
                          }}
                        >
                          <Image
                            className='wk-meal-img'
                            src={p.mealImageUrl || PLACEHOLDER_IMG}
                            alt={p.mealName}
                          />
                        </div>
                        <div className='wk-meal-info'>
                          <span className='wk-meal-type'>
                            {t.icon} {t.label}
                          </span>
                          <span className='wk-meal-name'>{p.mealName}</span>
                        </div>
                        <button
                          className='wk-meal-replace'
                          disabled={isReplacing}
                          onClick={() =>
                            handleReplaceMeal(p.date, p.typeId, p.mealId)
                          }
                        >
                          {isReplacing ? (
                            <Spinner animation='border' size='sm' />
                          ) : (
                            <i className='fa-solid fa-shuffle'></i>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      <AppToast {...toast} />
    </div>
  );
}
