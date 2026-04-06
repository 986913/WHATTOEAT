import '../styles/components/MealCard.css';
import { Spinner } from 'react-bootstrap';

export type Ingredient = { id: number; name: string };

export type MealCardPlan = {
  date: string;
  typeId: number;
  mealId: number | null;           // null = AI-suggested new meal
  mealName?: string;
  mealVideoUrl?: string;
  mealImageUrl?: string;
  mealIngredients?: Ingredient[];
  isOwnMeal?: boolean;
  // AI fields
  isAiSuggestion?: boolean;        // true = new meal not in library (Option C card)
  reason?: string;                 // AI's reason for picking this meal
  suggestionIngredients?: string[]; // ingredient names for new AI meals
  isSkeleton?: boolean;            // true = placeholder during streaming
};

const PLACEHOLDER_IMG =
  'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png';

interface MealCardProps {
  plan: MealCardPlan;
  typeLabel: string;
  typeIcon: string;
  isShuffling?: boolean;
  isRevealing?: boolean;
  isFlipped?: boolean;
  onFlip?: () => void;
  onShuffle?: () => void;
  onVideo?: (url: string) => void;
  /** compact mode for week plan cards */
  compact?: boolean;
}

export default function MealCard({
  plan,
  typeLabel,
  typeIcon,
  isShuffling,
  isRevealing,
  isFlipped,
  onFlip,
  onShuffle,
  onVideo,
  compact,
}: MealCardProps) {
  // ── Skeleton variant ──────────────────────────────
  if (plan.isSkeleton) {
    return (
      <div className={`mc-card mc-card-skeleton${compact ? ' mc-card-compact' : ''}`}>
        <div className='mc-label'>
          <span className='mc-label-icon'>{typeIcon}</span>
          {typeLabel}
        </div>
        <div className='mc-skeleton-image' />
        <div className='mc-body'>
          <div className='mc-skeleton-line' />
          <div className='mc-skeleton-line mc-skeleton-line-short' />
        </div>
      </div>
    );
  }

  // ── AI Suggestion variant (new meal, not in library) ──
  if (plan.isAiSuggestion) {
    return (
      <div className={`mc-card mc-card-ai-suggestion${compact ? ' mc-card-compact' : ''}`}>
        <div className='mc-label'>
          <span className='mc-label-icon'>{typeIcon}</span>
          {typeLabel}
        </div>
        <div className='mc-ai-image-area'>
          🤖
          <span className='mc-ai-badge'>✨ AI New</span>
        </div>
        <div className='mc-body'>
          <div className='mc-name'>{plan.mealName}</div>
          {plan.reason && <div className='mc-reason'>"{plan.reason}"</div>}
          {plan.suggestionIngredients && plan.suggestionIngredients.length > 0 && (
            <div className='mc-suggestion-ingredients'>
              {plan.suggestionIngredients.slice(0, 4).map((ing) => (
                <span key={ing} className='mc-suggestion-ingredient'>{ing}</span>
              ))}
            </div>
          )}
          <div className='mc-actions'>
            <button className='mc-btn-save-to-library'>
              + Save to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  let cardClass = 'mc-card';
  if (compact) cardClass += ' mc-card-compact';
  if (isShuffling) cardClass += ' mc-card-shuffling';
  if (isRevealing) cardClass += ' mc-card-reveal';
  if (isFlipped) cardClass += ' mc-card-flipped';

  return (
    <div className={cardClass}>
      <div className='mc-label'>
        <span className='mc-label-icon'>{typeIcon}</span>
        {typeLabel}
      </div>

      <div className='mc-flipper' onClick={onFlip}>
        {/* Front — image */}
        <div className='mc-front'>
          <img
            className='mc-image'
            src={plan.mealImageUrl || PLACEHOLDER_IMG}
            alt={plan.mealName}
          />
          <div className='mc-flip-hint'>
            <i className='fa-solid fa-list'></i> Ingredients
          </div>
        </div>

        {/* Back — ingredients */}
        <div className='mc-back'>
          <div className='mc-back-title'>
            <i className='fa-solid fa-basket-shopping'></i> Ingredients
          </div>
          <ul className='mc-ingredients'>
            {plan.mealIngredients && plan.mealIngredients.length > 0 ? (
              plan.mealIngredients.map((ing) => (
                <li key={ing.id}>{ing.name}</li>
              ))
            ) : (
              <li className='mc-no-ing'>No ingredients listed</li>
            )}
          </ul>
          <div className='mc-back-hint'>Tap to flip back</div>
        </div>
      </div>

      <div className='mc-body'>
        <div className='mc-name'>
          {plan.mealName}
          {plan.isOwnMeal && (
            <span className='mc-own-badge'>My Meal</span>
          )}
          {plan.reason && !plan.isOwnMeal && (
            <span className='mc-ai-pick-badge'>✨ AI Pick</span>
          )}
        </div>
        {plan.reason && <div className='mc-reason'>"{plan.reason}"</div>}

        <div className='mc-actions'>
          {plan.mealVideoUrl && onVideo && (
            <button
              className='mc-btn mc-btn-video'
              onClick={() => onVideo(plan.mealVideoUrl!)}
            >
              <i className='fa-solid fa-play'></i> Video
            </button>
          )}
          {onShuffle && (
            <button
              className='mc-btn mc-btn-shuffle'
              disabled={isShuffling}
              onClick={onShuffle}
            >
              {isShuffling ? (
                <Spinner animation='border' size='sm' />
              ) : (
                <>
                  <i className='fa-solid fa-shuffle'></i> Shuffle
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
