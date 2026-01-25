import './index.css';
import { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import { Form, Button, Alert, Spinner, Table, Modal } from 'react-bootstrap';

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

  // feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // =========================
  // Fetch meal options by type
  // =========================
  useEffect(() => {
    async function fetchMeals() {
      setLoadingMeals(true);
      setMealId('');
      setError('');

      try {
        const res = await axios.get(`/meals/options?typeId=${typeId}`);
        setMeals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setMeals([]);
        setError('❌ Failed to load meal options');
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
      setError('❌ Failed to load plans');
    }

    setLoadingPlans(false);
  };

  // load plans on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================
  // Submit create plan
  // =========================
  const handleSubmit = async () => {
    setSuccess('');
    setError('');

    if (!mealId) {
      setError('❌ Please select a meal');
      return;
    }

    try {
      await axios.post('/plans', {
        date,
        typeId,
        mealId,
        userId: 1,
      });

      setSuccess('✅ Plan created successfully!');
      setShowModal(false);

      // refresh plans immediately
      fetchPlans();
    } catch (err) {
      setError('❌ Failed to create plan (restriction violation?)');
    }
  };

  // =========================
  // Grouped debug view
  // =========================
  const grouped = groupPlans(plans);

  return (
    <div className='page'>
      <h2 className='page-title'>🍱 Plan Dashboard</h2>

      {/* Feedback */}
      {success && <Alert variant='success'>{success}</Alert>}
      {error && <Alert variant='danger'>{error}</Alert>}

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
                        <Button size='sm' variant='danger' disabled>
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

        {/* ================= RIGHT: Create + Debug ================= */}
        <div className='plans-right'>
          <h3>⚙️ Plan Tools</h3>

          {/* Create Plan Button */}
          <Button variant='success' onClick={() => setShowModal(true)}>
            + Create Plan
          </Button>

          {/* ================= Modal ================= */}
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
                Create!
              </Button>
            </Modal.Footer>
          </Modal>

          {/* ================= Restriction Debug View ================= */}
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
    </div>
  );
}
