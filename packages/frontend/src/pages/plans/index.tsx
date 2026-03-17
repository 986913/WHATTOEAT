import '../../styles/pages/plans.css';
import { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import ConfirmModal from '../../components/ConfirmModal';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Spinner, Button, Accordion } from 'react-bootstrap';

// Group flat plans into: { [date]: { [username]: { breakfast?, lunch?, dinner?, snack? } } }
function groupByDateAndUser(plans: any[]) {
  const map = new Map<string, Map<string, Record<string, any>>>();

  for (const plan of plans) {
    const date = plan.date;
    const user = plan.user?.username ?? 'Unknown';

    if (!map.has(date)) map.set(date, new Map());
    const dateMap = map.get(date)!;

    if (!dateMap.has(user)) dateMap.set(user, {});
    const userSlots = dateMap.get(user)!;

    const typeName = plan.type?.name ?? 'other';
    userSlots[typeName] = plan;
  }

  // Sort dates descending
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, userMap]) => ({
      date,
      users: Array.from(userMap.entries()).map(([username, slots]) => ({
        username,
        slots,
      })),
    }));
}

const TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];
const TYPE_EMOJI: Record<string, string> = {
  breakfast: '\u2600\uFE0F',
  lunch: '\uD83C\uDF1E',
  dinner: '\uD83C\uDF19',
  snack: '\uD83C\uDF7F',
};

export default function Plans() {
  const { toast, error, success } = useToast();

  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const [groupedPlans, setGroupedPlans] = useState<any[]>([]);
  const [loadingGrouped, setLoadingGrouped] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await axios.get('/plans');
      setPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      error(err);
    }
    setLoadingPlans(false);
  };

  const fetchGroupedPlans = async () => {
    setLoadingGrouped(true);
    try {
      const res = await axios.get('/plans/byUser');
      setGroupedPlans(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      error(err);
    }
    setLoadingGrouped(false);
  };

  useEffect(() => {
    fetchPlans();
    fetchGroupedPlans();
  }, []);

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;
    try {
      await axios.delete(`/plans/${selectedPlan.id}`);
      success('Plan deleted successfully');
      setSelectedPlan(null);
      fetchPlans();
      fetchGroupedPlans();
    } catch (err) {
      error('Failed to delete plan');
    }
  };

  const dateGroups = groupByDateAndUser(plans);

  // Collect all unique usernames across all dates for consistent columns
  const allUsers = Array.from(new Set(plans.map((p) => p.user?.username ?? 'Unknown'))).sort();

  return (
    <div className='page'>
      <h2 className='page-title'>Admin Plans Dashboard</h2>

      <div className='plans-layout'>
        {/* ================= LEFT: Plans by Date ================= */}
        <div className='plans-left'>
          <h3><i className='fa-solid fa-calendar-days' style={{ marginRight: 8 }} />All Plans</h3>

          {loadingPlans ? (
            <div className='loading-box'>
              <Spinner animation='border' size='sm' /> Loading plans...
            </div>
          ) : dateGroups.length === 0 ? (
            <div className='table-empty'>No Plans Found</div>
          ) : (
            <div className='plans-date-list'>
              {dateGroups.map(({ date, users }) => (
                <div key={date} className='plans-date-card'>
                  <div className='plans-date-header'>{date}</div>

                  <table className='plans-grid-table'>
                    <thead>
                      <tr>
                        <th>User</th>
                        {TYPE_ORDER.map((t) => (
                          <th key={t}>{TYPE_EMOJI[t]} {t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(({ username, slots }) => (
                        <tr key={username}>
                          <td className='plans-grid-user'>{username}</td>
                          {TYPE_ORDER.map((t) => {
                            const plan = slots[t];
                            return (
                              <td key={t} className={plan ? 'plans-grid-meal' : 'plans-grid-empty'}>
                                {plan ? (
                                  <div className='plans-meal-cell'>
                                    <span>{plan.meal?.name}</span>
                                    <button
                                      className='plans-delete-btn'
                                      title='Delete this plan'
                                      onClick={() => setSelectedPlan(plan)}
                                    >
                                      <i className='fa-solid fa-xmark' />
                                    </button>
                                  </div>
                                ) : (
                                  <span className='plans-grid-dash'>-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= RIGHT: Plans By User ================= */}
        <div className='plans-right'>
          <h3><i className='fa-solid fa-users' style={{ marginRight: 8 }} />Plans By User</h3>

          {loadingGrouped ? (
            <div className='loading-box'>
              <Spinner animation='border' size='sm' /> Loading grouped plans...
            </div>
          ) : groupedPlans.length === 0 ? (
            <div className='table-empty'>No User Plans Found</div>
          ) : (
            <Accordion alwaysOpen={false}>
              {groupedPlans.map((group: any, index: number) => (
                <Accordion.Item
                  eventKey={String(index)}
                  key={group.user.id}
                  className='debug-box'
                >
                  <Accordion.Header>
                    <i className='fa-solid fa-user' style={{ marginRight: 8 }} />
                    {group.user.username}
                    <span style={{ marginLeft: 10, fontSize: 13, color: '#666' }}>
                      — {group.plans.length} plans
                    </span>
                  </Accordion.Header>

                  <Accordion.Body>
                    <table className='plans-grid-table compact'>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Meal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.plans.map((plan: any) => (
                          <tr key={plan.id}>
                            <td>{plan.date}</td>
                            <td>{plan.type?.name ?? '-'}</td>
                            <td>{plan.meal?.name ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </div>
      </div>

      {/* ================= Delete Confirm ================= */}
      <ConfirmModal
        show={!!selectedPlan}
        title='Delete Plan'
        message='Are you sure you want to delete this plan?'
        onCancel={() => setSelectedPlan(null)}
        onConfirm={handleDeletePlan}
      />

      <AppToast {...toast} />
    </div>
  );
}
