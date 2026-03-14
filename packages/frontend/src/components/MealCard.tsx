import './MealCard.css';
import { Spinner } from 'react-bootstrap';

export type Ingredient = { id: number; name: string };

export type MealCardPlan = {
  date: string;
  typeId: number;
  mealId: number;
  mealName?: string;
  mealVideoUrl?: string;
  mealImageUrl?: string;
  mealIngredients?: Ingredient[];
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
        <div className='mc-name'>{plan.mealName}</div>

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
