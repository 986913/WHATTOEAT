import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button, Form } from 'react-bootstrap';

const DEFAULT_LIMIT = 10;

export default function Meals() {
  // ================= Filters =================
  const [typeInputVal, setTypeInputVal] = useState<string | undefined>(
    undefined,
  );

  // ================= Data =================
  const [meals, setMeals] = useState<any[]>([]);

  // ================= Pagination =================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  const totalPages = Math.ceil(totalCount / limit);

  // ================= Derived =================
  const isFilterDirty = Boolean(typeInputVal);

  // ================= Create Modal =================
  const [showModal, setShowModal] = useState(false);

  // ================= Delete Modal =================
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  // ================= Create Form =================
  const [mealName, setMealName] = useState('');
  const [mealUrl, setMealUrl] = useState('');

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Ingredient Options
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>(
    [],
  );
  const handleCreateIngredient = async () => {
    if (!ingredientSearch.trim()) return;

    try {
      setCreatingIngredient(true);

      // 1. POST create ingredient
      const res = await axios.post('/ingredients', {
        name: ingredientSearch.trim(),
      });

      const newIngredient = res.data;
      // 2. Add into options list
      setIngredientOptions((prev) => [...prev, newIngredient]);
      // 3. Auto select it
      setSelectedIngredientIds((prev) => [...prev, newIngredient.id]);
      // 4. Clear search
      setIngredientSearch('');
    } catch (err) {
      console.error('Error creating ingredient:', err);
      alert('创建 ingredient 失败');
    } finally {
      setCreatingIngredient(false);
    }
  };
  const filteredIngredients = ingredientOptions.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()),
  );

  const ALL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

  // ================= Fetch Meals =================
  const fetchMeals = async (page: number, type?: string) => {
    const params: any = { page, limit };
    if (type !== undefined) params.type = type;

    try {
      const res = await axios.get('/meals', { params });

      const data = res.data.meals || [];
      setMeals(data);

      setTotalCount(res.data.mealsTotalCount || data.length);
      setCurrentPage(res.data.currPage || page);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      setTotalCount(0);
    }
  };

  // ================= Fetch Ingredients =================
  const fetchIngredients = async () => {
    try {
      const res = await axios.get('/ingredients');
      setIngredientOptions(res.data || []);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setIngredientOptions([]);
    }
  };

  // Initial load meals
  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Initial load ingredients
  useEffect(() => {
    fetchIngredients();
  }, []);

  // ================= Clear Filters =================
  const clearAllFilters = async () => {
    setTypeInputVal(undefined);
    setCurrentPage(1);
    await fetchMeals(1);
  };

  // ================= Create Meal =================
  const handleCreateMeal = async () => {
    try {
      await axios.post('/meals', {
        name: mealName,
        url: mealUrl,
        types: selectedTypes,
        ingredientIds: selectedIngredientIds, // ✅正确字段
      });

      // reset
      setShowModal(false);
      setMealName('');
      setMealUrl('');
      setSelectedTypes([]);
      setSelectedIngredientIds([]);
      setIngredientSearch('');

      fetchMeals(1);
    } catch (error) {
      console.error('Error creating meal:', error);
      alert('创建 meal 失败，请检查控制台');
    }
  };

  // ================= Delete Meal =================
  const openDeleteModal = (meal: any) => {
    setSelectedMeal(meal);
    setShowDeleteModal(true);
  };

  const handleDeleteMeal = async () => {
    if (!selectedMeal) return;

    try {
      await axios.delete(`/meals/${selectedMeal.id}`);
      setShowDeleteModal(false);
      fetchMeals(currentPage);
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('删除 meal 失败，请检查控制台');
    }
  };

  return (
    <div className='meals-page'>
      {/* ================= Header ================= */}
      <div
        className='page-header'
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h3 className='page-title'>Meals</h3>

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

            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
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
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {meals.length === 0 ? (
            <tr>
              <td colSpan={7} className='table-empty'>
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

                <td>
                  {meal.ingredients?.map((i: any) => i.name).join(', ') || '-'}
                </td>

                <td>
                  <Button variant='primary' size='sm' disabled>
                    Edit
                  </Button>{' '}
                  <Button
                    variant='danger'
                    size='sm'
                    onClick={() => openDeleteModal(meal)}
                  >
                    Delete
                  </Button>
                </td>
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
            {/* Meal Name */}
            <Form.Group className='mb-3'>
              <Form.Label>Meal Name</Form.Label>
              <Form.Control
                type='text'
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
              />
            </Form.Group>

            {/* Meal URL */}
            <Form.Group className='mb-3'>
              <Form.Label>Meal URL</Form.Label>
              <Form.Control
                type='text'
                value={mealUrl}
                onChange={(e) => setMealUrl(e.target.value)}
              />
            </Form.Group>

            {/* Meal Types */}
            <Form.Group className='mb-3'>
              <Form.Label>Meal Types</Form.Label>

              {ALL_TYPES.map((t) => (
                <Form.Check
                  key={t}
                  type='checkbox'
                  label={t}
                  checked={selectedTypes.includes(t)}
                  onChange={(e) =>
                    setSelectedTypes((prev) =>
                      e.target.checked
                        ? [...prev, t]
                        : prev.filter((x) => x !== t),
                    )
                  }
                />
              ))}
            </Form.Group>

            {/* Ingredients */}
            {/* ================= Ingredients Searchable Dropdown ================= */}
            {/* ================= Ingredients Searchable + Create New ================= */}
            <Form.Group className='mb-3'>
              <Form.Label>Ingredients</Form.Label>

              {/* Search Input */}
              <Form.Control
                type='text'
                placeholder='Search ingredient...'
                value={ingredientSearch}
                onChange={(e) => setIngredientSearch(e.target.value)}
                className='mb-2'
              />

              {/* Dropdown Box */}
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '8px',
                }}
              >
                {/* If no match → show create option */}
                {filteredIngredients.length === 0 ? (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    <div>No matching ingredients.</div>

                    <Button
                      size='sm'
                      variant='outline-success'
                      style={{ marginTop: '8px' }}
                      disabled={creatingIngredient}
                      onClick={handleCreateIngredient}
                    >
                      {creatingIngredient
                        ? 'Creating...'
                        : `+ Create "${ingredientSearch}"`}
                    </Button>
                  </div>
                ) : (
                  filteredIngredients.map((ing) => (
                    <div
                      key={ing.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 0',
                      }}
                    >
                      <Form.Check
                        type='checkbox'
                        checked={selectedIngredientIds.includes(ing.id)}
                        onChange={(e) =>
                          setSelectedIngredientIds((prev) =>
                            e.target.checked
                              ? [...prev, ing.id]
                              : prev.filter((x) => x !== ing.id),
                          )
                        }
                      />
                      <span>{ing.name}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Preview */}
              {selectedIngredientIds.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <strong>Selected:</strong>{' '}
                  {ingredientOptions
                    .filter((ing) => selectedIngredientIds.includes(ing.id))
                    .map((ing) => ing.name)
                    .join(', ')}
                </div>
              )}
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

      {/* ================= Delete Modal ================= */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Meal</Modal.Title>
        </Modal.Header>

        <Modal.Body>Are you sure you want to delete this meal?</Modal.Body>

        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>

          <Button variant='danger' onClick={handleDeleteMeal}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
