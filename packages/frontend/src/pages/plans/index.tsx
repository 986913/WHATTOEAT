import './index.css';
import { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import ConfirmModal from '../../components/ConfirmModal';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';
import { Table, Spinner, Button, Accordion } from 'react-bootstrap';

export default function Plans() {
  const { toast, error, success } = useToast();

  // =========================
  // Flat plans (Left side)
  // =========================
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // =========================
  // Grouped plans (Right side)
  // =========================
  const [groupedPlans, setGroupedPlans] = useState<any[]>([]);
  const [loadingGrouped, setLoadingGrouped] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // =========================
  // Fetch all plans
  // =========================
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

  // =========================
  // Fetch grouped by user
  // =========================
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

  // =========================
  // Delete Plan
  // =========================
  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      await axios.delete(`/plans/${selectedPlan.id}`);
      success('Plan deleted successfully 🗑️');
      setSelectedPlan(null);
      fetchPlans();
      fetchGroupedPlans();
    } catch (err) {
      error('Failed to delete plan ❌');
    }
  };

  return (
    <div className='page'>
      <h2 className='page-title'>Admin Plans Dashboard</h2>

      <div className='plans-layout'>
        {/* ================= LEFT: All Plans ================= */}
        <div className='plans-left'>
          <h3>📋 All Plans</h3>

          {loadingPlans ? (
            <div className='loading-box'>
              <Spinner animation='border' size='sm' /> Loading plans...
            </div>
          ) : (
            <Table striped bordered hover className='plans-table'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Meal</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='table-empty'>
                      No Plans Found
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.date}</td>
                      <td>{plan.user?.username ?? '-'}</td>
                      <td>{plan.type?.name ?? '-'}</td>
                      <td>{plan.meal?.name ?? '-'}</td>
                      <td>
                        <Button
                          size='sm'
                          variant='danger'
                          onClick={() => setSelectedPlan(plan)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </div>

        {/* ================= RIGHT: Plans By User ================= */}
        <div className='plans-right'>
          <h3>👥 Plans By User</h3>

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
                    👤 {group.user.username} (ID: {group.user.id})
                    <span
                      style={{ marginLeft: 10, fontSize: 13, color: '#666' }}
                    >
                      — {group.plans.length} plans
                    </span>
                  </Accordion.Header>

                  <Accordion.Body>
                    <Table striped bordered hover size='sm'>
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
                    </Table>
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

      {/* ================= Toast ================= */}
      <AppToast
        show={toast.show}
        title={toast.title}
        message={toast.message}
        variant={toast.variant}
        onClose={toast.close}
      />
    </div>
  );
}
