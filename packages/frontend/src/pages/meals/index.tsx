import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const DEFAULT_LIMIT = 10;

export default function Meals() {
  // ===== Filters =====
  const [typeInputVal, setTypeInputVal] = useState<string | undefined>(
    undefined,
  );

  // ===== Data =====
  const [meals, setMeals] = useState<any[]>([]);

  // ===== Pagination =====
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  // ===== Derived state =====
  const isFilterDirty = Boolean(typeInputVal);

  // ===== Create Modal =====
  const [showModal, setShowModal] = useState(false);

  // ===== Create Form =====
  const [mealName, setMealName] = useState('');
  const [mealUrl, setMealUrl] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [ingredientsInput, setIngredientsInput] = useState('');

  const ALL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

  // ===== Fetch Meals =====
  const fetchMeals = async (page: number, type?: string) => {
    const params: any = { page, limit };
    if (type !== undefined) params.type = type;

    try {
      const res = await axios.get('/meals', { params });
      const data = res.data.meals || [];
      setMeals(data);
      setTotalCount(data.length);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      setTotalCount(0);
    }
  };

  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / limit);

  const clearAllFilters = async () => {
    setTypeInputVal(undefined);
    setCurrentPage(1);
    await fetchMeals(1);
  };

  const handleCreateMeal = async () => {
    const ingredients = ingredientsInput
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    await axios.post('/meals', {
      name: mealName,
      url: mealUrl,
      types: selectedTypes,
      ingredients,
    });

    setShowModal(false);
    // 重置表单
    setMealName('');
    setMealUrl('');
    setSelectedTypes([]);
    setIngredientsInput('');
    // 刷新列表
    fetchMeals(1);
  };

  return (
    <div className='meals-page'>
      <div
        className='page-header'
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 className='page-title'>Meals</h3>
        {/* Create Meal Button */}
        <Button variant='success' onClick={() => setShowModal(true)}>
          + Create Meal
        </Button>
      </div>

      {/* ================= Filters ================= */}
      <div className='filters-bar'>
        <div className='filters-left'>
          <select
            className='filter-select'
            value={typeInputVal ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setTypeInputVal(val === '' ? undefined : val);
              setCurrentPage(1);
            }}
          >
            <option value=''>All Types</option>
            <option value='breakfast'>Breakfast</option>
            <option value='lunch'>Lunch</option>
            <option value='dinner'>Dinner</option>
            <option value='snack'>Snack</option>
          </select>

          <button
            className='btn-search'
            onClick={() => fetchMeals(1, typeInputVal)}
          >
            Search
          </button>
        </div>

        <button
          className={`btn-clear ${isFilterDirty ? 'active' : 'disabled'}`}
          disabled={!isFilterDirty}
          onClick={clearAllFilters}
        >
          Clear All Filters
        </button>
      </div>

      {/* ================= Table ================= */}
      <Table striped bordered hover className='meals-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>URL</th>
            <th>Types</th>
            <th>Creator</th>
            <th>Ingredients</th>
          </tr>
        </thead>
        <tbody>
          {meals.length === 0 ? (
            <tr>
              <td colSpan={6} className='table-empty'>
                No Data
              </td>
            </tr>
          ) : (
            meals.map((meal, index) => (
              <tr key={meal.id}>
                <td>{(currentPage - 1) * limit + index + 1}</td>
                <td>{meal.name}</td>
                <td>
                  {meal.url ? (
                    <a href={meal.url} target='_blank' rel='noreferrer'>
                      Link
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{meal.types?.map((t: any) => t.name).join(', ')}</td>
                <td>{meal.user?.username ?? '-'}</td>
                <td>{meal.ingredients?.map((i: any) => i.name).join(', ')}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* ================= Pagination ================= */}
      {totalPages > 1 && (
        <Pagination className='pagination-bar'>
          <Pagination.Prev
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          />
          {Array.from({ length: totalPages }).map((_, i) => {
            const page = i + 1;
            return (
              <Pagination.Item
                key={page}
                active={page === currentPage}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Pagination.Item>
            );
          })}
          <Pagination.Next
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          />
        </Pagination>
      )}

      {/* ================= Create Meal Modal ================= */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Meal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className='mb-3'>
              <Form.Label>Meal Name</Form.Label>
              <Form.Control
                type='text'
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Meal URL</Form.Label>
              <Form.Control
                type='text'
                value={mealUrl}
                onChange={(e) => setMealUrl(e.target.value)}
              />
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Meal Types</Form.Label>
              {ALL_TYPES.map((t) => (
                <Form.Check
                  key={t}
                  type='checkbox'
                  label={t.charAt(0).toUpperCase() + t.slice(1)}
                  checked={selectedTypes.includes(t)}
                  onChange={(e) => {
                    setSelectedTypes((prev) =>
                      e.target.checked
                        ? [...prev, t]
                        : prev.filter((x) => x !== t),
                    );
                  }}
                />
              ))}
            </Form.Group>

            <Form.Group className='mb-3'>
              <Form.Label>Ingredients (comma separated)</Form.Label>
              <Form.Control
                type='text'
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                placeholder='e.g. egg, tomato, cheese'
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant='success' onClick={handleCreateMeal}>
            Create!
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
