import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';

export default function Plans() {
  // form state
  const [date, setDate] = useState('');
  const [typeId, setTypeId] = useState('1');
  const [mealId, setMealId] = useState('');

  // dropdown meals
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // ✅ fetch meals when type changes
  useEffect(() => {
    async function fetchMeals() {
      setLoading(true);
      setMealId('');
      setSuccess('');
      setError('');

      try {
        const res = await axios.get(`/meals/options?typeId=${typeId}`);
        setMeals(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setMeals([]);
        setError('❌ Failed to load meals');
      }

      setLoading(false);
    }

    fetchMeals();
  }, [typeId]);

  // ✅ submit create plan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mealId) {
      setError('❌ Please select a meal');
      return;
    }

    try {
      const res = await axios.post('/plans', {
        date,
        typeId,
        mealId,
        userId: 1,
      });

      console.log('Created plan:', res.data);
      setSuccess('✅ Plan created successfully!');
    } catch (err) {
      setError('❌ Failed to create plan (restriction violation?)');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h2>Create Plan Test UI</h2>

      {success && <Alert variant='success'>{success}</Alert>}
      {error && <Alert variant='danger'>{error}</Alert>}

      <Form onSubmit={handleSubmit}>
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

        {/* Meals dropdown */}
        <Form.Group className='mb-3'>
          <Form.Label>Meal</Form.Label>

          {loading ? (
            <div>
              <Spinner animation='border' size='sm' /> Loading...
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

        {/* Submit */}
        <Button type='submit'>Create Plan</Button>
      </Form>
    </div>
  );
}
