import '../../styles/pages/weekplans.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner } from 'react-bootstrap';
import { useCurrentUserStore } from '../../store/useCurrentUserStore';
import VideoPreviewModal from '../../components/VideoPreviewModal';
import MealCard, { type MealCardPlan } from '../../components/MealCard';
import GroceryListModal from '../../components/GroceryListModal';
import dayjs from 'dayjs';
import AiGenerateModal from '../../components/AiGenerateModal';
import { useAiMealPlan, type AiDay } from '../../hooks/useAiMealPlan';

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
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [streamState, setStreamState] = useState<'idle' | 'generating' | 'ai-draft'>('idle');
  const [daysReady, setDaysReady] = useState(0);
  const [currentPreference, setCurrentPreference] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [streamText, setStreamText] = useState('');
  const streamTextRef = useRef<HTMLPreElement>(null);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  useEffect(() => {
    if (currentUser?.id && !initialized.current) {
      initialized.current = true;
      loadWeek();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Auto-open AI modal when navigated here with ?ai=true
  useEffect(() => {
    if (searchParams.get('ai') === 'true') {
      setShowAiModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (saveReadyTimer.current) clearTimeout(saveReadyTimer.current);
    };
  }, []);

  // Add .is-stuck when sentinel scrolls out of viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const header = stickyHeaderRef.current;
    if (!sentinel || !header) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        header.classList.toggle('is-stuck', !entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
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
        typeId: p.type?.id ?? TYPE_NAME_TO_ID[p.type?.name?.toLowerCase()] ?? 0,
        mealId: p.meal?.id ?? 0,
        mealName: p.meal?.name,
        mealVideoUrl: p.meal?.videoUrl,
        mealImageUrl: p.meal?.imageUrl,
        mealIngredients: p.meal?.ingredients?.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
        })),
        isOwnMeal: !!p.meal?.isOwnMeal,
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
    const hasUnsaved = draftPlans.some((p) => p.isAiSuggestion && p.mealId === null);
    if (hasUnsaved) {
      error('Save or shuffle all AI suggestions before saving the week');
      return;
    }
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
                isOwnMeal: res.data.isOwnMeal,
                isAiSuggestion: false,
                reason: undefined,
                suggestionIngredients: undefined,
              }
            : p,
        ),
      );
      setIsSaved(false);
      // Reset from ai-draft so "Back to Saved" becomes visible again
      setStreamState((prev) => (prev === 'ai-draft' ? 'idle' : prev));
    } catch {
      error('No other meals available for this type');
    } finally {
      setReplacingKey(null);
    }
  };

  const buildSkeletonPlans = (startDate: string): DraftPlan[] =>
    Array.from({ length: 7 }, (_, i) =>
      dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
    ).flatMap((date) =>
      [1, 2, 3].map((typeId) => ({
        date,
        typeId,
        mealId: null,
        isSkeleton: true,
      })),
    );

  const handleChunk = useCallback((text: string) => {
    setStreamText((prev) => {
      const next = prev + text;
      // Keep only last 2000 chars so DOM stays light
      return next.length > 2000 ? next.slice(-2000) : next;
    });
    // Auto-scroll to bottom
    requestAnimationFrame(() => {
      if (streamTextRef.current) {
        streamTextRef.current.scrollTop = streamTextRef.current.scrollHeight;
      }
    });
  }, []);

  const { startGeneration, isConnecting } = useAiMealPlan({
    onChunk: handleChunk,
    onDay: (day: AiDay) => {
      setDaysReady((prev) => prev + 1);
      setDraftPlans((prev) => {
        const withoutThisDay = prev.filter((p) => p.date !== day.date);
        const newMeals: DraftPlan[] = (day.meals ?? []).map((m) => ({
          date: day.date,
          typeId: m.typeId,
          mealId: m.mealId,
          mealName: m.mealId === null ? m.suggestion?.name : m.mealName,
          mealImageUrl: m.mealImageUrl ?? undefined,
          mealVideoUrl: m.mealVideoUrl ?? undefined,
          mealIngredients: m.mealIngredients,
          isOwnMeal: m.isOwnMeal,
          isAiSuggestion: m.mealId === null,
          reason: m.reason,
          suggestionIngredients: m.suggestion?.ingredients,
        }));
        return [...withoutThisDay, ...newMeals].sort((a, b) =>
          a.date !== b.date
            ? a.date.localeCompare(b.date)
            : a.typeId - b.typeId,
        );
      });
    },
    onDone: () => {
      setStreamState('ai-draft');
      setIsSaved(false);
    },
    onError: (msg: string) => {
      setStreamState('idle');
      error(msg);
    },
  });

  const handleSaveToLibrary = async (p: DraftPlan) => {
    if (!p.mealName) return;
    try {
      const res = await axios.post<{ id: number; name: string; imageUrl: string }>(
        '/meals/me/save-ai',
        {
          typeId: p.typeId,
          name: p.mealName,
          ingredientNames: p.suggestionIngredients ?? [],
        },
      );
      // Transition card from AI suggestion → My Meal
      setDraftPlans((prev) =>
        prev.map((d) =>
          d.date === p.date && d.typeId === p.typeId
            ? {
                ...d,
                mealId: res.data.id,
                isAiSuggestion: false,
                isOwnMeal: true,
                mealImageUrl: res.data.imageUrl || undefined,
                mealVideoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`how to cook ${p.mealName ?? ''}`)}`,
                mealIngredients: (p.suggestionIngredients ?? []).map(
                  (name, idx) => ({ id: idx, name }),
                ),
              }
            : d,
        ),
      );
      success('Saved to your library!');
    } catch {
      error('Failed to save meal');
    }
  };

  const handleAiGenerate = async (preference: string) => {
    setShowAiModal(false);
    setCurrentPreference(preference);
    setStreamState('generating');
    setDaysReady(0);
    setStreamText('');
    setIsSaved(false);
    setDraftPlans(buildSkeletonPlans(tomorrow));
    await startGeneration(preference, tomorrow);
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

      {/* Sentinel — when this scrolls out, the header becomes stuck */}
      <div ref={sentinelRef} style={{ height: 1, marginBottom: -1 }} />

      {/* ── Sticky Banner + Save CTA ─────────────────── */}
      <div className='wk-sticky-header' ref={stickyHeaderRef}>
      {streamState === 'generating' ? (
        <>
          <div className='wk-banner wk-banner--generating'>
            <div className='wk-banner-generating-dot' />
            <div className='wk-banner-body'>
              <div className='wk-banner-eyebrow'>GENERATING</div>
              <div className='wk-banner-title'>AI is planning your week…</div>
              <div className='wk-banner-meta'>{daysReady} of 7 days ready · "{currentPreference}"</div>
            </div>
          </div>
          <div className='ai-stream-panel'>
            <div className='ai-stream-panel-header'>
              <span className='ai-stream-panel-dot' />
              <span className='ai-stream-panel-label'>Claude is thinking</span>
            </div>
            <pre ref={streamTextRef} className='ai-stream-panel-text'>
              {streamText}
              <span className='ai-stream-cursor'>▌</span>
            </pre>
          </div>
        </>
      ) : isSaved ? (
        <div className='wk-banner wk-banner--saved'>
          <div className='wk-banner-icon'><i className='fa-solid fa-circle-check' /></div>
          <div className='wk-banner-body'>
            <div className='wk-banner-eyebrow'>SAVED PLAN</div>
            <div className='wk-banner-title'>Your week is locked in</div>
            <div className='wk-banner-meta'>{draftPlans.length} meals · shuffle anytime to explore changes</div>
          </div>
          <div className='wk-banner-actions'>
            <button className='plan-banner-btn' onClick={() => setShowGroceryList(true)}>
              <i className='fa-solid fa-cart-shopping'></i> Grocery List
            </button>
            <button className='plan-banner-btn' onClick={() => generateFresh()} disabled={loadingPreview}>
              <i className='fa-solid fa-arrows-rotate'></i> Regenerate
            </button>
            <button className='plan-banner-btn-ai' onClick={() => setShowAiModal(true)}>
              <i className='fa-solid fa-wand-magic-sparkles'></i> AI Generate
            </button>
          </div>
        </div>
      ) : streamState === 'ai-draft' ? (
        <div className='wk-banner wk-banner--ai'>
          <div className='wk-banner-icon'>✨</div>
          <div className='wk-banner-body'>
            <div className='wk-banner-eyebrow'>AI PLAN READY</div>
            <div className='wk-banner-title'>"{currentPreference}"</div>
            <div className='wk-banner-meta'>Shuffle what you want to change, then save below</div>
          </div>
          <div className='wk-banner-actions'>
            {hasSavedPlan.current && (
              <button className='plan-banner-btn' onClick={loadWeek}>
                <i className='fa-solid fa-rotate-left'></i> Restore Saved Plan
              </button>
            )}
            <button className='plan-banner-btn' onClick={() => generateFresh()} disabled={loadingPreview}>
              <i className='fa-solid fa-arrows-rotate'></i> Reshuffle
            </button>
            <button className='plan-banner-btn-ai' onClick={() => setShowAiModal(true)}>
              <i className='fa-solid fa-wand-magic-sparkles'></i> AI Generate
            </button>
          </div>
        </div>
      ) : (
        <div className='wk-banner wk-banner--draft'>
          <div className='wk-banner-icon'><i className='fa-solid fa-dice' /></div>
          <div className='wk-banner-body'>
            <div className='wk-banner-eyebrow'>DRAFT PREVIEW</div>
            <div className='wk-banner-title'>Randomly picked for you</div>
            <div className='wk-banner-meta'>Shuffle meals you don't like, or let AI plan smarter</div>
          </div>
          <div className='wk-banner-actions'>
            {hasSavedPlan.current && (
              <button className='plan-banner-btn' onClick={loadWeek}>
                <i className='fa-solid fa-rotate-left'></i> Restore Saved Plan
              </button>
            )}
            <button className='plan-banner-btn' onClick={() => generateFresh()} disabled={loadingPreview}>
              <i className='fa-solid fa-arrows-rotate'></i> Reshuffle
            </button>
            <button className='plan-banner-btn-ai' onClick={() => setShowAiModal(true)}>
              <i className='fa-solid fa-wand-magic-sparkles'></i> AI Generate
            </button>
          </div>
        </div>
      )}

      {/* ── Save Week CTA (separated from explore actions) ── */}
      {!isSaved && streamState !== 'generating' && (
        <div className='wk-save-cta'>
          <button
            className='wk-save-cta-btn'
            onClick={handleSaveWeek}
            disabled={loadingCommit || !draftPlans.length || !saveReady}
          >
            {loadingCommit ? (
              <><Spinner animation='border' size='sm' /> Saving…</>
            ) : !saveReady ? (
              <><i className='fa-solid fa-eye'></i> Review your meals first…</>
            ) : (
              <><i className='fa-solid fa-bookmark'></i> Save This Week's Plan</>
            )}
          </button>
        </div>
      )}
      </div>{/* end wk-sticky-header */}

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
                        onFlip={() => setFlippedKey(isFlipped ? null : key)}
                        onShuffle={() =>
                          handleReplaceMeal(p.date, p.typeId, p.mealId ?? 0)
                        }
                        onVideo={(url) => setVideoUrl(url)}
                        onSaveToLibrary={
                          p.isAiSuggestion
                            ? () => { void handleSaveToLibrary(p); }
                            : undefined
                        }
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
      {showAiModal && (
        <AiGenerateModal
          isLoading={isConnecting}
          onGenerate={(pref) => { void handleAiGenerate(pref); }}
          onClose={() => setShowAiModal(false)}
        />
      )}
      <AppToast {...toast} />
    </div>
  );
}
