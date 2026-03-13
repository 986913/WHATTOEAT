import './index.css';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner } from 'react-bootstrap';
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

const MEAL_TYPES = [
  { id: 1, label: 'Breakfast', icon: '🍳' },
  { id: 2, label: 'Lunch', icon: '🥗' },
  { id: 3, label: 'Dinner', icon: '🍝' },
];

const PLACEHOLDER_IMG =
  'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png';

export default function Today() {
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);
  const navigate = useNavigate();

  const [allDrafts, setAllDrafts] = useState<DraftPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [shufflingType, setShufflingType] = useState<number | null>(null);
  const [revealingType, setRevealingType] = useState<number | null>(null);
  const [shufflingAll, setShufflingAll] = useState(false);
  const [revealingAll, setRevealingAll] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = allDrafts.filter((p) => p.date === today);

  useEffect(() => {
    if (currentUser?.id && allDrafts.length === 0) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
      });
      setAllDrafts(res.data.draftPlans || []);
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
      setAllDrafts((prev) =>
        prev.map((p) =>
          p.date === today && p.typeId === typeId
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
      setShufflingType(null);
      setRevealingType(typeId);
      revealTimer.current = setTimeout(() => setRevealingType(null), 500);
    } catch {
      error('No other meals available');
      setShufflingType(null);
    }
  };

  const handleShuffleAll = async () => {
    if (!currentUser?.id) return;
    try {
      setShufflingAll(true);
      const res = await axios.post('/plans/weekly-preview', {
        userId: currentUser.id,
      });
      setAllDrafts(res.data.draftPlans || []);
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
          <div className='today-cards'>
            {MEAL_TYPES.map((type) => {
              const plan = todayPlans.find((p) => p.typeId === type.id);
              if (!plan) return null;

              const isShuffling = shufflingType === type.id || shufflingAll;
              const isRevealing = revealingType === type.id || revealingAll;

              let cardClass = 'today-card';
              if (isShuffling) cardClass += ' today-card-shuffling';
              if (isRevealing) cardClass += ' today-card-reveal';

              return (
                <div key={type.id} className={cardClass}>
                  <div className='today-card-label'>
                    <span className='today-card-label-icon'>{type.icon}</span>
                    {type.label}
                  </div>

                  <div
                    className='today-card-image-wrap'
                    onClick={() => {
                      if (plan.mealVideoUrl) setVideoUrl(plan.mealVideoUrl);
                    }}
                  >
                    <img
                      className='today-card-image'
                      src={plan.mealImageUrl || PLACEHOLDER_IMG}
                      alt={plan.mealName}
                    />
                    {plan.mealVideoUrl && (
                      <div className='today-card-play'>
                        <i className='fa-solid fa-play'></i>
                      </div>
                    )}
                  </div>

                  <div className='today-card-body'>
                    <div className='today-card-name'>{plan.mealName}</div>

                    <div className='today-card-actions'>
                      <button
                        className='today-btn today-btn-shuffle'
                        disabled={isShuffling}
                        onClick={() => handleShuffle(type.id, plan.mealId)}
                      >
                        {isShuffling ? (
                          <Spinner animation='border' size='sm' />
                        ) : (
                          <>
                            <i className='fa-solid fa-shuffle'></i> Shuffle
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
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
            <button
              className='today-btn-secondary'
              onClick={() => navigate('/home/wkplans')}
            >
              View Full Week <i className='fa-solid fa-arrow-right'></i>
            </button>
          </div>
        </>
      ) : (
        !loading && (
          <div className='today-empty'>
            <div className='today-empty-dice'>🎲</div>
            <h2>Ready to roll?</h2>
            <p>Let us pick today's meals for you</p>
            <button className='today-btn-main' onClick={handleGenerate}>
              <span className='today-btn-main-dice'>🎲</span> Roll the Dice
            </button>
          </div>
        )
      )}

      {/* Contribute Teaser */}
      {todayPlans.length > 0 && (
        <div className='today-teaser'>
          <div className='today-teaser-content'>
            <div className='today-teaser-icon'>🍳</div>
            <div className='today-teaser-text'>
              <h3>Don't see your favorite dish?</h3>
              <p>
                Add your own meals and they'll be available in your shuffle
                rotation.
              </p>
            </div>
            <button
              className='today-teaser-btn'
              onClick={() => setShowContributeModal(true)}
            >
              <i className='fa-solid fa-plus'></i>
              Create Your Meal
              <span className='today-teaser-badge'>Beta</span>
            </button>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && (
        <div
          className='today-modal-backdrop'
          onClick={() => setShowContributeModal(false)}
        >
          <div
            className='today-modal'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className='today-modal-close'
              onClick={() => setShowContributeModal(false)}
            >
              <i className='fa-solid fa-xmark'></i>
            </button>
            <div className='today-modal-icon'>🍳</div>
            <h2>Create Your Own Meal</h2>
            <p className='today-modal-desc'>
              We're building a way for you to contribute your favorite recipes.
              Once added, your meals will join the shuffle rotation — so you'll
              never run out of ideas.
            </p>
            <div className='today-modal-features'>
              <div className='today-modal-feature'>
                <i className='fa-solid fa-utensils'></i>
                <span>Add your own recipes with ingredients</span>
              </div>
              <div className='today-modal-feature'>
                <i className='fa-solid fa-shuffle'></i>
                <span>Your meals join the shuffle rotation</span>
              </div>
              <div className='today-modal-feature'>
                <i className='fa-solid fa-video'></i>
                <span>Attach cooking videos for reference</span>
              </div>
            </div>
            <div className='today-modal-status'>
              <span className='today-modal-status-dot'></span>
              Currently in testing — launching soon
            </div>
          </div>
        </div>
      )}

      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />
      <AppToast {...toast} />
    </div>
  );
}
