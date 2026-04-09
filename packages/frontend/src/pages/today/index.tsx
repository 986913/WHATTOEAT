import '../../styles/pages/today.css';
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
import PlanBanner from '../../components/PlanBanner';
import dayjs from 'dayjs';

type DraftPlan = MealCardPlan;

const MEAL_TYPES = [
  { id: 1, label: 'Breakfast', icon: '🍳' },
  { id: 2, label: 'Lunch', icon: '🥗' },
  { id: 3, label: 'Dinner', icon: '🍝' },
];

const TYPE_NAME_TO_ID: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

export default function Today() {
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();

  const [todayPlans, setTodayPlans] = useState<DraftPlan[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shufflingType, setShufflingType] = useState<number | null>(null);
  const [revealingType, setRevealingType] = useState<number | null>(null);
  const [shufflingAll, setShufflingAll] = useState(false);
  const [revealingAll, setRevealingAll] = useState(false);
  const [savingToday, setSavingToday] = useState(false);
  const [flippedType, setFlippedType] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const hasSavedPlan = useRef(false);

  const today = dayjs().format('YYYY-MM-DD');

  useEffect(() => {
    if (currentUser?.id && !initialized.current) {
      initialized.current = true;
      loadToday();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  // Try saved plans first, fallback to generate
  const loadToday = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await axios.get('/plans/me', {
        params: { from: today, to: today },
      });
      const allPlans: any[] = Array.isArray(res.data) ? res.data : [];

      const savedToday = allPlans.map((p: any) => ({
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
          isOwnMeal: !!p.meal?.isOwnMeal,
        }));

      if (savedToday.length > 0) {
        setTodayPlans(savedToday);
        setIsSaved(true);
        hasSavedPlan.current = true;
      } else {
        await generateFresh();
      }
    } catch {
      await generateFresh();
    } finally {
      setLoading(false);
    }
  };

  const generateFresh = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
        startDate: today,
      });
      const allDrafts: DraftPlan[] = res.data.draftPlans || [];
      setTodayPlans(allDrafts.filter((p) => p.date === today));
      setIsSaved(false);
    } catch {
      error('Failed to generate meals');
    } finally {
      setLoading(false);
    }
  };

  const handleShuffle = async (typeId: number, currentMealId: number) => {
    try {
      setShufflingType(typeId);
      const res = await axios.post('/plans/replace-meal', {
        typeId,
        excludeMealId: currentMealId,
      });
      setTodayPlans((prev) =>
        prev.map((p) =>
          p.typeId === typeId
            ? {
                ...p,
                mealId: res.data.mealId,
                mealName: res.data.mealName,
                mealVideoUrl: res.data.mealVideoUrl,
                mealImageUrl: res.data.mealImageUrl,
                mealIngredients: res.data.mealIngredients,
                isOwnMeal: res.data.isOwnMeal,
              }
            : p,
        ),
      );
      setIsSaved(false);
      setShufflingType(null);
      setRevealingType(typeId);
      revealTimer.current = setTimeout(() => setRevealingType(null), 500);
    } catch {
      error('No other meals available');
      setShufflingType(null);
    }
  };

  const handleSaveToday = async () => {
    if (!currentUser?.id || !todayPlans.length) return;
    try {
      setSavingToday(true);
      await axios.post('/plans/weekly-commit', {
        plans: todayPlans.map((p) => ({
          date: p.date,
          typeId: p.typeId,
          mealId: p.mealId,
          userId: currentUser.id,
        })),
      });
      setIsSaved(true);
      hasSavedPlan.current = true;
      setShowGroceryList(true);
      success('Today\'s plan saved!');
    } catch {
      error('Failed to save today\'s plan');
    } finally {
      setSavingToday(false);
    }
  };

  const handleShuffleAll = async () => {
    if (!currentUser?.id) return;
    try {
      setShufflingAll(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
        startDate: today,
      });
      const allDrafts: DraftPlan[] = res.data.draftPlans || [];
      setTodayPlans(allDrafts.filter((p) => p.date === today));
      setIsSaved(false);
      setShufflingAll(false);
      setRevealingAll(true);
      revealTimer.current = setTimeout(() => setRevealingAll(false), 600);
      success('New meals picked!');
    } catch {
      error('Failed to shuffle');
      setShufflingAll(false);
    }
  };

  // Loading
  if (loading && todayPlans.length === 0) {
    return (
      <div className='today-loading'>
        <div className='today-loading-dice'>🎲</div>
        <p>Rolling your meals...</p>
        <Spinner animation='border' variant='warning' />
      </div>
    );
  }

  return (
    <div className='today-page'>
      <div className='today-hero'>
        <h1 className='today-title'>What should we cook today?</h1>
        <p className='today-subtitle'>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {todayPlans.length > 0 ? (
        <>
          {isSaved ? (
            <PlanBanner
              variant='saved'
              title='Saved Plan'
              description="Your meals for today are locked in. Shuffle to explore other options."
              actions={
                <button
                  className='plan-banner-btn'
                  onClick={() => setShowGroceryList(true)}
                >
                  <i className='fa-solid fa-cart-shopping'></i> Grocery List
                </button>
              }
            />
          ) : (
            <PlanBanner
              variant='draft'
              title='Draft Preview'
              description="These meals were randomly picked. Shuffle what you don't like, then save."
              actions={
                hasSavedPlan.current ? (
                  <button className='plan-banner-btn' onClick={loadToday}>
                    <i className='fa-solid fa-rotate-left'></i> Restore Saved Plan
                  </button>
                ) : undefined
              }
            />
          )}

          <div className='today-cards'>
            {MEAL_TYPES.map((type) => {
              const plan = todayPlans.find((p) => p.typeId === type.id);
              if (!plan) return null;

              const isShuffling = shufflingType === type.id || shufflingAll;
              const isRevealing = revealingType === type.id || revealingAll;
              const isFlipped = flippedType === type.id;

              return (
                <MealCard
                  key={type.id}
                  plan={plan}
                  typeLabel={type.label}
                  typeIcon={type.icon}
                  isShuffling={isShuffling}
                  isRevealing={isRevealing}
                  isFlipped={isFlipped}
                  onFlip={() =>
                    setFlippedType(isFlipped ? null : type.id)
                  }
                  onShuffle={() => handleShuffle(type.id, plan.mealId ?? 0)}
                  onVideo={(url) => setVideoUrl(url)}
                />
              );
            })}
          </div>

          <div className='today-bottom'>
            <button
              className='today-btn-main'
              onClick={handleShuffleAll}
              disabled={shufflingAll}
            >
              {shufflingAll ? (
                <>
                  <Spinner animation='border' size='sm' /> Rolling...
                </>
              ) : (
                <>
                  <span className='today-btn-main-dice'>🎲</span> Shuffle All
                  Meals
                </>
              )}
            </button>
            {!isSaved && (
              <button
                className='today-btn-save'
                onClick={handleSaveToday}
                disabled={savingToday}
              >
                {savingToday ? (
                  <>
                    <Spinner animation='border' size='sm' /> Saving...
                  </>
                ) : (
                  <>
                    <i className='fa-solid fa-bookmark'></i> Save Today's Plan
                  </>
                )}
              </button>
            )}
            <button
              className='today-btn-ai'
              onClick={() => navigate('/home/wkplans?ai=true')}
            >
              <i className='fa-solid fa-wand-magic-sparkles'></i> AI Plan My Week
            </button>
            <button
              className='today-btn-secondary'
              onClick={() => navigate('/home/wkplans')}
            >
              See full week <i className='fa-solid fa-arrow-right'></i>
            </button>
          </div>
          <p className='today-custom-hint'>
            Missing a dish?{' '}
            <button
              className='today-custom-hint-link'
              onClick={() => navigate('/home/mymeals')}
            >
              Add custom meals <i className='fa-solid fa-arrow-right'></i>
            </button>
          </p>
        </>
      ) : (
        !loading && (
          <div className='today-empty'>
            <div className='today-empty-dice'>🎲</div>
            <h2>Ready to roll?</h2>
            <p>Let us pick today's meals for you</p>
            <button className='today-btn-main' onClick={generateFresh}>
              <span className='today-btn-main-dice'>🎲</span> Roll the Dice
            </button>
          </div>
        )
      )}


      {showGroceryList && (
        <GroceryListModal
          plans={todayPlans}
          onClose={() => setShowGroceryList(false)}
        />
      )}
      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      <AppToast {...toast} />
    </div>
  );
}
