import './index.css';
import { useState } from 'react';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Button, Spinner, Modal, Image } from 'react-bootstrap';
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

export default function WeekPlans() {
  const { toast, success, error } = useToast();
  const currentUser = useCurrentUserStore((s) => s.currentUser);

  const [draftPlans, setDraftPlans] = useState<DraftPlan[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const isEmptyState = draftPlans.length === 0;

  function getMealType(typeId: number) {
    if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
    if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
    if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
    return { label: 'Unknown', icon: '❓' };
  }

  function groupPlansByDate(plans: DraftPlan[]) {
    const grouped: Record<string, DraftPlan[]> = {};
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
      success('Your week is ready 🎲');
    } catch {
      error('Failed to generate weekly plan ❌');
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
      success('Week saved successfully ✅');
    } catch {
      error('Failed to save weekly plans ❌');
    } finally {
      setLoadingCommit(false);
    }
  };

  const grouped = groupPlansByDate(draftPlans);

  return (
    <div className='page'>
      {/* HEADER */}
      {!isEmptyState && (
        <div className='week-header'>
          <div>
            <h4 className='week-title'>📅 This Week’s Plan</h4>
            <p className='week-sub'>Review and adjust before saving</p>
          </div>

          <div className='week-actions'>
            <Button
              variant='outline-secondary'
              onClick={handleGenerateWeekly}
              disabled={loadingPreview || loadingCommit}
            >
              {loadingPreview ? (
                <>
                  <Spinner animation='border' size='sm' /> Generating...
                </>
              ) : (
                '🔄 Regenerate'
              )}
            </Button>

            <Button
              variant='success'
              onClick={handleSaveWeek}
              disabled={!draftPlans.length || loadingCommit}
            >
              {loadingCommit ? (
                <>
                  <Spinner animation='border' size='sm' /> Saving...
                </>
              ) : (
                '💾 Save Week'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* WELCOME */}
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

      {/* SUMMARY */}
      {draftPlans.length > 0 && (
        <div className='week-summary'>
          {Object.keys(grouped).length} Days • {draftPlans.length} Meals •
          {new Set(draftPlans.map((p) => p.mealName).filter(Boolean)).size}{' '}
          Unique Dishes Dishes
        </div>
      )}

      {/* VERTICAL LIST */}
      {draftPlans.length > 0 && (
        <div className='week-vertical'>
          {Object.entries(grouped).map(([date, plans]) => (
            <div key={date} className='day-section'>
              <div className='day-section-header'>📅 {date}</div>
              <div className='meal-items'>
                {plans
                  .sort((a, b) => a.typeId - b.typeId)
                  .map((p) => {
                    const t = getMealType(p.typeId);
                    return (
                      <div
                        key={`${p.date}-${p.typeId}`}
                        className='meal-item'
                        onClick={() => {
                          if (p.mealVideoUrl) setVideoUrl(p.mealVideoUrl);
                        }}
                      >
                        <Image
                          className='meal-image'
                          src={
                            p.mealImageUrl ||
                            'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png'
                          }
                          alt={p.mealName}
                        />

                        <div className='meal-content'>
                          <div className='meal-type-line'>
                            <span className={`meal-badge type-${p.typeId}`}>
                              {t.icon}
                            </span>
                            <span className='meal-type-label'>{t.label}</span>
                          </div>

                          <div className='meal-title'>{p.mealName}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PREVIEW VIDEO MODAL */}
      <VideoPreviewModal url={videoUrl} onClose={() => setVideoUrl(null)} />

      <AppToast {...toast} onClose={toast.close} />
    </div>
  );
}
