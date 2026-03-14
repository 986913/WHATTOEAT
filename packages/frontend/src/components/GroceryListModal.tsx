import './GroceryListModal.css';
import { useState } from 'react';
import type { MealCardPlan } from './MealCard';

const TYPE_LABELS: Record<number, string> = {
  1: 'Breakfast',
  2: 'Lunch',
  3: 'Dinner',
};

interface GroceryGroup {
  mealName: string;
  typeLabel: string;
  count: number;
  ingredients: { id: number; name: string }[];
}

function buildGroups(plans: MealCardPlan[]): GroceryGroup[] {
  const groups: GroceryGroup[] = [];
  const indexByMealId = new Map<number, number>();

  for (const p of plans) {
    if (!p.mealIngredients?.length) continue;

    const existing = indexByMealId.get(p.mealId);
    if (existing !== undefined) {
      // Same meal appears again (e.g. same dinner on two different days)
      groups[existing].count += 1;
      continue;
    }

    indexByMealId.set(p.mealId, groups.length);
    groups.push({
      mealName: p.mealName || 'Unknown Meal',
      typeLabel: TYPE_LABELS[p.typeId] || '',
      count: 1,
      ingredients: p.mealIngredients,
    });
  }

  return groups;
}

function generateDownloadText(
  groups: GroceryGroup[],
  checked: Set<string>,
): string {
  const lines: string[] = ['Grocery Shopping List', '====================', ''];

  for (const g of groups) {
    const qty = g.count > 1 ? ` x${g.count}` : '';
    lines.push(`${g.mealName} (${g.typeLabel})${qty}`);
    lines.push('-'.repeat(g.mealName.length + g.typeLabel.length + qty.length + 3));
    for (const ing of g.ingredients) {
      const mark = checked.has(`${g.mealName}-${ing.id}`) ? 'x' : ' ';
      const ingQty = g.count > 1 ? ` x${g.count}` : '';
      lines.push(`  [${mark}] ${ing.name}${ingQty}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

interface GroceryListModalProps {
  plans: MealCardPlan[];
  onClose: () => void;
}

export default function GroceryListModal({
  plans,
  onClose,
}: GroceryListModalProps) {
  const groups = buildGroups(plans);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const totalItems = groups.reduce((n, g) => n + g.ingredients.length, 0);
  const checkedCount = checked.size;

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownload = () => {
    const text = generateDownloadText(groups, checked);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grocery-list.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (groups.length === 0) return null;

  return (
    <div className='gl-backdrop' onClick={onClose}>
      <div className='gl-modal' onClick={(e) => e.stopPropagation()}>
        <button className='gl-close' onClick={onClose}>
          <i className='fa-solid fa-xmark'></i>
        </button>

        <div className='gl-header'>
          <div className='gl-header-icon'>🛒</div>
          <h2>Grocery List</h2>
          <p>Tap items to mark as bought</p>
        </div>

        {/* Progress */}
        {totalItems > 0 && (
          <div className='gl-progress'>
            <div className='gl-progress-bar'>
              <div
                className='gl-progress-fill'
                style={{
                  width: `${(checkedCount / totalItems) * 100}%`,
                }}
              />
            </div>
            <div className='gl-progress-text'>
              {checkedCount} / {totalItems} bought
            </div>
          </div>
        )}

        <div className='gl-body'>
          {groups.map((g, gi) => (
            <div key={gi} className='gl-meal-group'>
              <div className='gl-meal-name'>
                {g.mealName}
                <span className='gl-meal-type-badge'>{g.typeLabel}</span>
                {g.count > 1 && (
                  <span className='gl-meal-count-badge'>x{g.count}</span>
                )}
              </div>
              <ul className='gl-items'>
                {g.ingredients.map((ing) => {
                  const key = `${g.mealName}-${ing.id}`;
                  const isChecked = checked.has(key);
                  return (
                    <li
                      key={key}
                      className={`gl-item ${isChecked ? 'gl-item-checked' : ''}`}
                      onClick={() => toggle(key)}
                    >
                      <span className='gl-checkbox'>
                        {isChecked && (
                          <i className='fa-solid fa-check'></i>
                        )}
                      </span>
                      <span className='gl-item-name'>
                        {ing.name}
                        {g.count > 1 && (
                          <span className='gl-item-qty'>x{g.count}</span>
                        )}
                      </span>
                      {isChecked && (
                        <span className='gl-item-bought-label'>bought</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {gi < groups.length - 1 && <div className='gl-divider' />}
            </div>
          ))}
        </div>

        <div className='gl-footer'>
          <button
            className='gl-btn-download'
            onClick={handleDownload}
            disabled={checkedCount >= totalItems}
          >
            <i className='fa-solid fa-download'></i>
            {checkedCount >= totalItems ? 'All Bought!' : 'Download List'}
          </button>
          <button className='gl-btn-close' onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
