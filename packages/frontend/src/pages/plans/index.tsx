import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // refresh plans immediately
      fetchPlans();
    } catch (err) {
      setError('❌ Failed to create plan (restriction violation?)');
    }
  };

  // =========================
  // Debug grouped view
  // =========================
  const grouped = groupPlans(plans);

  return (
    <div style={{ maxWidth: 900, margin: '40px auto' }}>
      <h2>Create Plan + Restriction Debug UI</h2>

      {/* Feedback */}
      {success && <Alert variant='success'>{success}</Alert>}
      {error && <Alert variant='danger'>{error}</Alert>}

      {/* =========================
          Create Form
      ========================= */}
      <Form onSubmit={handleSubmit} style={{ marginBottom: 40 }}>
        {/* Date */}
        <Form.Group className='mb-3'>
          <Form.Label>Date</Form.Label>
          <Form.Control
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
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
            <option value='4'>Snack</option>
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

        <Button type='submit'>Create Plan</Button>
      </Form>

      {/* =========================
          Restriction Debug View
      ========================= */}
      <h3>Restriction Debug View</h3>

      {loadingPlans ? (
        <div style={{ marginTop: 20 }}>
          <Spinner animation='border' size='sm' /> Loading plans...
        </div>
      ) : plans.length === 0 ? (
        <p>No plans found.</p>
      ) : (
        Object.entries(grouped).map(([date, types]: any) => (
          <div
            key={date}
            style={{
              border: '1px solid #ddd',
              padding: '15px',
              marginBottom: '20px',
              borderRadius: '12px',
            }}
          >
            <h5>{date}</h5>

            {['breakfast', 'lunch', 'dinner'].map((mealType) => {
              const items = types[mealType] || [];

              // ❌ Missing
              if (items.length === 0) {
                return (
                  <p key={mealType} style={{ color: 'red' }}>
                    ❌ {mealType.toUpperCase()}: Missing
                  </p>
                );
              }

              // ⚠️ Duplicate
              if (items.length > 1) {
                return (
                  <p key={mealType} style={{ color: 'orange' }}>
                    ⚠️ {mealType.toUpperCase()}: Duplicate ({items.length})
                  </p>
                );
              }

              // ✅ Normal
              return (
                <p key={mealType} style={{ color: 'green' }}>
                  ✅ {mealType.toUpperCase()}: {items[0].meal?.name}
                </p>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
