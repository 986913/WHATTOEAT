import './index.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner } from 'react-bootstrap';
import { useCurrentUserStore } from '../../store/useCurrentUserStore';
import VideoPreviewModal from '../../components/VideoPreviewModal';
import MealCard, { type MealCardPlan } from '../../components/MealCard';
import GroceryListModal from '../../components/GroceryListModal';
import dayjs from 'dayjs';

type DraftPlan = MealCardPlan;

const TYPE_NAME_TO_ID: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

function getMealType(typeId: number) {
  if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
  if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
  if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
  return { label: 'Unknown', icon: '❓' };
}

function formatDayHeader(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
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
  const { toast, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();
  const initialized = useRef(false);
  const hasSavedPlan = useRef(false);

  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [replacingKey, setReplacingKey] = useState<string | null>(null);
  const [flippedKey, setFlippedKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [saveReady, setSaveReady] = useState(true);
  const saveReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  useEffect(() => {
    if (currentUser?.id && !initialized.current) {
      initialized.current = true;
      loadWeek();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    return () => {
      if (saveReadyTimer.current) clearTimeout(saveReadyTimer.current);
    };
  }, []);

  const loadWeek = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingPreview(true);
      const res = await axios.get('/plans/me', {
        params: { from: tomorrow, sort: 'ASC' },
      });
      const allPlans: any[] = Array.isArray(res.data) ? res.data : [];

      const upcomingPlans = allPlans.map((p: any) => ({
        date: p.date,
        typeId:
          p.type?.id ??
          TYPE_NAME_TO_ID[p.type?.name?.toLowerCase()] ??
          0,
        mealId: p.meal?.id ?? 0,
        mealName: p.meal?.name,
        mealVideoUrl: p.meal?.videoUrl,
        mealImageUrl: p.meal?.imageUrl,
        mealIngredients: p.meal?.ingredients?.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
        })),
      }));

      if (upcomingPlans.length > 0) {
        setDraftPlans(upcomingPlans);
        setIsSaved(true);
        hasSavedPlan.current = true;
      } else {
        await generateFresh();
      }
    } catch {
      await generateFresh();
    } finally {
      setLoadingPreview(false);
    }
  };

  const generateFresh = async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingPreview(true);
      setSaveReady(false);
      if (saveReadyTimer.current) clearTimeout(saveReadyTimer.current);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
        startDate: tomorrow,
      });
      setDraftPlans(res.data.draftPlans || []);
      setIsSaved(false);
      // Give the user time to review meals before showing Save
      saveReadyTimer.current = setTimeout(() => setSaveReady(true), 3000);
    } catch {
      error('Failed to generate weekly plan');
      setSaveReady(true);
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
      setSaved(true);
      setIsSaved(true);
      hasSavedPlan.current = true;
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
                mealIngredients: res.data.mealIngredients,
              }
            : p,
        ),
      );
      setIsSaved(false);
    } catch {
      error('No other meals available for this type');
    } finally {
      setReplacingKey(null);
    }
  };

  const grouped = groupPlansByDate(draftPlans);

  if (loadingPreview && draftPlans.length === 0) {
    return (
      <div className='wk-loading'>
        <div className='wk-loading-icon'>📅</div>
        <p>Loading your week...</p>
        <Spinner animation='border' variant='warning' />
      </div>
    );
  }

  return (
    <div className='wk-page'>
      {/* Hero */}
      <div className='wk-hero'>
        <h1 className='wk-hero-title'>Plan Your Week</h1>
        <p className='wk-hero-subtitle'>
          {new Date(tomorrow + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
          })}{' '}
          —{' '}
          {draftPlans.length > 0
            ? new Date(
                draftPlans[draftPlans.length - 1].date + 'T00:00:00',
              ).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })
            : '...'}
        </p>
      </div>

      {/* State Banner */}
      {isSaved ? (
        <div className='wk-banner wk-banner-saved'>
          <div className='wk-banner-left'>
            <i className='fa-solid fa-circle-check'></i>
            <div>
              <div className='wk-banner-title'>Saved Plan</div>
              <div className='wk-banner-desc'>
                Your upcoming week is all set. Shuffle individual meals or
                regenerate the whole week.
              </div>
            </div>
          </div>
          <div className='wk-banner-actions'>
            <button
              className='wk-banner-btn'
              onClick={() => setShowGroceryList(true)}
            >
              <i className='fa-solid fa-cart-shopping'></i> Grocery List
            </button>
            <button
              className='wk-banner-btn'
              onClick={() => {
                generateFresh();
              }}
              disabled={loadingPreview}
            >
              <i className='fa-solid fa-arrows-rotate'></i> Regenerate
            </button>
          </div>
        </div>
      ) : (
        <div className='wk-banner wk-banner-draft'>
          <div className='wk-banner-left'>
            <i className='fa-solid fa-wand-magic-sparkles'></i>
            <div>
              <div className='wk-banner-title'>Draft Preview</div>
              <div className='wk-banner-desc'>
                These meals were randomly generated. Shuffle what you don't like,
                then save.
              </div>
            </div>
          </div>
          <div className='wk-banner-actions'>
            {hasSavedPlan.current && (
              <button className='wk-banner-btn' onClick={loadWeek}>
                <i className='fa-solid fa-rotate-left'></i> Back to Saved
              </button>
            )}
            <button
              className={`wk-banner-btn-save ${!saveReady ? 'wk-banner-btn-save-hidden' : ''}`}
              onClick={handleSaveWeek}
              disabled={loadingCommit || !draftPlans.length || !saveReady}
            >
              {loadingCommit ? (
                <>
                  <Spinner animation='border' size='sm' /> Saving...
                </>
              ) : !saveReady ? (
                <>
                  <i className='fa-solid fa-eye'></i> Review your meals...
                </>
              ) : (
                <>
                  <i className='fa-solid fa-bookmark'></i> Save Week
                </>
              )}
            </button>
            <button
              className='wk-banner-btn'
              onClick={() => generateFresh()}
              disabled={loadingPreview}
            >
              <i className='fa-solid fa-arrows-rotate'></i>
            </button>
          </div>
        </div>
      )}

      {/* Day Cards */}
      <div className='wk-days'>
        {Object.entries(grouped).map(([date, plans]) => {
          const { weekday, date: dateLabel } = formatDayHeader(date);
          return (
            <div key={date} className='wk-day-card'>
              <div className='wk-day-card-header'>
                <span className='wk-day-card-weekday'>{weekday}</span>
                <span className='wk-day-card-date'>{dateLabel}</span>
              </div>

              <div className='wk-day-card-meals'>
                {plans
                  .sort((a, b) => a.typeId - b.typeId)
                  .map((p) => {
                    const t = getMealType(p.typeId);
                    const key = `${p.date}-${p.typeId}`;
                    const isReplacing = replacingKey === key;
                    const isFlipped = flippedKey === key;

                    return (
                      <MealCard
                        key={key}
                        plan={p}
                        typeLabel={t.label}
                        typeIcon={t.icon}
                        compact
                        isShuffling={isReplacing}
                        isFlipped={isFlipped}
                        onFlip={() =>
                          setFlippedKey(isFlipped ? null : key)
                        }
                        onShuffle={() =>
                          handleReplaceMeal(p.date, p.typeId, p.mealId)
                        }
                        onVideo={(url) => setVideoUrl(url)}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div className='wk-bottom'>
        <button
          className='wk-bottom-link'
          onClick={() => navigate('/home/today')}
        >
          <i className='fa-solid fa-arrow-left'></i> Back to Today
        </button>
      </div>

      {/* Save Success Overlay */}
      {saved && (
        <div className='wk-saved-backdrop'>
          <div className='wk-saved-modal'>
            <div className='wk-saved-check'>
              <i className='fa-solid fa-check'></i>
            </div>
            <h2>Week Saved!</h2>
            <p>Your meal plan is locked in. Here's what you can do next:</p>
            <div className='wk-saved-actions'>
              <button
                className='wk-saved-btn-primary'
                onClick={() => navigate('/home/today')}
              >
                <i className='fa-solid fa-house'></i>
                See Today's Meals
              </button>
              <button
                className='wk-saved-btn-outline'
                onClick={() => {
                  setSaved(false);
                  setShowGroceryList(true);
                }}
              >
                <i className='fa-solid fa-cart-shopping'></i>
                View Grocery List
              </button>
              <button
                className='wk-saved-btn-outline'
                onClick={() => navigate('/home/userplans')}
              >
                <i className='fa-solid fa-clock-rotate-left'></i>
                View Meal History
              </button>
              <button
                className='wk-saved-btn-text'
                onClick={() => {
                  setSaved(false);
                  generateFresh();
                }}
              >
                or generate a new week
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroceryList && (
        <GroceryListModal
          plans={draftPlans}
          onClose={() => setShowGroceryList(false)}
        />
      )}
      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      <AppToast {...toast} />
    </div>
  );
}
