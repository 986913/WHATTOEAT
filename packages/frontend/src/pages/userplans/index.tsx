import '../../styles/pages/userplans.css';
import { useEffect, useMemo, useState } from 'react';
import axios from '../../utils/axios';
import AppToast from '../../components/AppToast';
import AppPagination from '../../components/AppPagination';
import { useToast } from '../../hooks/useToast';
import { Spinner } from 'react-bootstrap';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍝',
};
const DEFAULT_LIMIT = 15; // plans per page (e.g. 5 days * 3 meals)

function groupPlansByDate(plans: any[]) {
  const grouped: Record<string, Record<string, any>> = {};
  plans.forEach((p) => {
    const date = p.date;
    const type = p.type?.name?.toLowerCase();
    if (!grouped[date]) grouped[date] = {};
    grouped[date][type] = p;
  });
  return grouped;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  return { weekday, month, day };
}

export default function UserPlans() {
  const { toast, error } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / DEFAULT_LIMIT);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [mealName, setMealName] = useState('');

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const grouped = useMemo(() => groupPlansByDate(plans), [plans]);

  const isFilterDirty = Boolean(dateFrom || dateTo || mealName);

  const fetchPlans = async (
    page: number,
    filters?: { from?: string; to?: string; mealName?: string },
  ) => {
    setLoadingPlans(true);
    try {
      // History 不能超过昨天，取用户选择和 yesterday 中更早的
      const effectiveTo =
        filters?.to && filters.to < yesterday ? filters.to : yesterday;
      const params: Record<string, string | number> = {
        page,
        limit: DEFAULT_LIMIT,
        to: effectiveTo,
      };
      if (filters?.from) params.from = filters.from;
      if (filters?.mealName) params.mealName = filters.mealName;

      const res = await axios.get('/plans/me', { params });

      // 支持分页返回 { data, total } 和非分页返回 array
      if (res.data.data) {
        setPlans(Array.isArray(res.data.data) ? res.data.data : []);
        setTotalCount(res.data.total || 0);
      } else {
        setPlans(Array.isArray(res.data) ? res.data : []);
        setTotalCount(res.data.length || 0);
      }
    } catch (err) {
      error(err);
    }
    setLoadingPlans(false);
  };

  useEffect(() => {
    const filters = isFilterDirty
      ? { from: dateFrom || undefined, to: dateTo || undefined, mealName: mealName || undefined }
      : undefined;
    fetchPlans(currentPage, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPlans(1, {
      from: dateFrom || undefined,
      to: dateTo || undefined,
      mealName: mealName || undefined,
    });
  };

  const clearAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setMealName('');
    setCurrentPage(1);
    fetchPlans(1);
  };

  const entries = Object.entries(grouped).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <div className='hist-page'>
      <div className='hist-hero'>
        <h1 className='hist-title'>Meal History</h1>
        <p className='hist-subtitle'>
          {entries.length > 0
            ? `${entries.length} day${entries.length > 1 ? 's' : ''} of meals`
            : 'Your past meals will show up here'}
        </p>
      </div>

      {/* Filters */}
      <div className='filters-bar hist-filters'>
        <div className='filters-left'>
          <label className='filter-label'>
            From
            <input
              className='filter-input'
              type='date'
              value={dateFrom}
              max={dateTo || yesterday}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className='filter-label'>
            To
            <input
              className='filter-input'
              type='date'
              value={dateTo}
              min={dateFrom || undefined}
              max={yesterday}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <input
            className='filter-input'
            placeholder='Meal name'
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
          />
          <button className='btn-search' onClick={handleSearch}>
            Search
          </button>
          <button
            className={`btn-clear ${isFilterDirty ? 'active' : 'disabled'}`}
            disabled={!isFilterDirty}
            onClick={clearAllFilters}
          >
            Clear
          </button>
        </div>
      </div>

      {loadingPlans ? (
        <div className='hist-loading'>
          <Spinner animation='border' variant='warning' />
          <p>Loading your history...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className='hist-empty'>
          <div className='hist-empty-icon'>📋</div>
          <h3>No meal history found</h3>
          <p>
            {isFilterDirty
              ? 'Try adjusting your filters'
              : 'Save a meal plan and it\'ll appear here after the day passes'}
          </p>
        </div>
      ) : (
        <>
          <div className='hist-timeline'>
            {entries.map(([date, meals]) => {
              const { weekday, month, day } = formatDate(date);
              return (
                <div key={date} className='hist-row'>
                  <div className='hist-date'>
                    <span className='hist-date-day'>{day}</span>
                    <span className='hist-date-meta'>
                      {weekday}, {month}
                    </span>
                  </div>
                  <div className='hist-dot'></div>
                  <div className='hist-meals'>
                    {MEAL_ORDER.map((type) => {
                      const plan = meals[type];
                      if (!plan) return null;
                      return (
                        <div key={type} className='hist-meal'>
                          <span className='hist-meal-icon'>
                            {MEAL_ICONS[type]}
                          </span>
                          <span className='hist-meal-name'>
                            {plan.meal?.name || '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <AppPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <AppToast {...toast} />
    </div>
  );
}
