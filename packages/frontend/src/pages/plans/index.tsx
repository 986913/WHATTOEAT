import './index.css';
import { useEffect, useState } from 'react';
import axios from '../../utils/axios';

import ConfirmModal from '../../components/ConfirmModal';
import AppToast from '../../components/AppToast';
import { useToast } from '../../hooks/useToast';

import { Form, Button, Spinner, Table, Modal } from 'react-bootstrap';

/** Helper: group plans by date + type */
function groupPlans(plans: any[]) {
  const grouped: any = {};

  plans.forEach((p) => {
    const date = p.date;
    const type = p.type?.name;

    if (!grouped[date]) grouped[date] = {};
    if (!grouped[date][type]) grouped[date][type] = [];

    grouped[date][type].push(p);
  });

  return grouped;
}

export default function Plans() {
  const { toast, success, error } = useToast();

  // =========================
  // Form state
  // =========================
  const [date, setDate] = useState('');
  const [typeId, setTypeId] = useState('1');
  const [mealId, setMealId] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // dropdown meals
  const [meals, setMeals] = useState<any[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  // plans list
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Delete state
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // =========================
  // Fetch meal options by type
  // =========================
  useEffect(() => {
    async function fetchMeals() {
      setLoadingMeals(true);
      setMealId('');

      try {
        const res = await axios.get(`/meals/options?typeId=${typeId}`);
        setMeals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setMeals([]);
        error(err);
      }

      setLoadingMeals(false);
    }

    fetchMeals();
  }, [typeId]);

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

  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================
  // Create Plan
  // =========================
  const handleSubmit = async () => {
    if (!mealId) {
      error('Please select a meal ❌');
      return;
    }

    try {
      await axios.post('/plans', {
        date,
        typeId,
        mealId,
        userId: 1,
      });

      success('Plan created successfully ✅');
      setShowModal(false);

      fetchPlans();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (status === 409) {
        error(`Duplicate plan: ${msg}`);
        alert(msg);
      } else if (status === 400) {
        error(`Invalid request: ${msg}`);
      } else {
        error('Unexpected server error ❌');
      }
    }
  };

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
    } catch (err) {
      console.error(err);
      error('Failed to delete plan ❌');
    }
  };

  // =========================
  // Debug grouped view
  // =========================
  const grouped = groupPlans(plans);

  return (
    <div className='page'>
      <h2 className='page-title'>Plans</h2>

      <div className='plans-layout'>
        {/* ================= LEFT: Plans Table ================= */}
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
                  <th>Type</th>
                  <th>Meal</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='table-empty'>
                      No Plans Found
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.date}</td>
                      <td>{plan.type?.name ?? '-'}</td>
                      <td>{plan.meal?.name ?? '-'}</td>

                      <td>
                        <Button size='sm' disabled>
                          Edit
                        </Button>{' '}
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

        {/* ================= RIGHT: Tools ================= */}
        <div className='plans-right'>
          <h3>⚙️ Plan Tools</h3>

          <Button variant='success' onClick={() => setShowModal(true)}>
            + Create Plan
          </Button>

          {/* ================= Create Modal ================= */}
          <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Create Plan</Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Form>
                {/* Date */}
                <Form.Group className='mb-3'>
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    type='date'
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Form.Group>

                {/* Type */}
                <Form.Group className='mb-3'>
                  <Form.Label>Meal Type</Form.Label>
                  <Form.Select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                  >
                    <option value='1'>Breakfast</option>
                    <option value='2'>Lunch</option>
                    <option value='3'>Dinner</option>
                  </Form.Select>
                </Form.Group>

                {/* Meal */}
                <Form.Group className='mb-3'>
                  <Form.Label>Meal</Form.Label>

                  {loadingMeals ? (
                    <div>
                      <Spinner animation='border' size='sm' /> Loading meals...
                    </div>
                  ) : (
                    <Form.Select
                      value={mealId}
                      onChange={(e) => setMealId(e.target.value)}
                    >
                      <option value=''>-- Select Meal --</option>
                      {meals.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Form>
            </Modal.Body>

            <Modal.Footer>
              <Button variant='secondary' onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant='success' onClick={handleSubmit}>
                Create
              </Button>
            </Modal.Footer>
          </Modal>

          {/* ================= Restriction Debug ================= */}
          <div className='debug-box'>
            <h4>Restriction Debug</h4>

            {Object.entries(grouped).map(([date, types]: any) => (
              <div key={date} className='debug-day'>
                <strong>{date}</strong>

                {['breakfast', 'lunch', 'dinner'].map((mealType) => {
                  const items = types[mealType] || [];

                  if (items.length === 0) {
                    return (
                      <p key={mealType} className='missing'>
                        ❌ {mealType.toUpperCase()} Missing
                      </p>
                    );
                  }

                  if (items.length > 1) {
                    return (
                      <p key={mealType} className='duplicate'>
                        ⚠️ {mealType.toUpperCase()} Duplicate
                      </p>
                    );
                  }

                  return (
                    <p key={mealType} className='ok'>
                      ✅ {mealType.toUpperCase()}: {items[0].meal?.name}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
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

      {/* ================= Toast Notification ================= */}
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
