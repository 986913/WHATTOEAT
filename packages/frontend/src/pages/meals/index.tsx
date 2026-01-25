import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';

import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button, Form } from 'react-bootstrap';

const DEFAULT_LIMIT = 10;
const ALL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/* ===================================================== */
/* ================= Ingredient Tags UI ================= */
/* ===================================================== */
function IngredientTags({
  ids,
  options,
  onRemove,
}: {
  ids: number[];
  options: any[];
  onRemove: (id: number) => void;
}) {
  const selected = options.filter((ing) => ids.includes(ing.id));
  if (selected.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {selected.map((ing) => (
        <span
          key={ing.id}
          style={{
            background: '#f1f3f5',
            borderRadius: '16px',
            padding: '4px 10px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {ing.name}
          <span
            style={{
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#666',
            }}
            onClick={() => onRemove(ing.id)}
          >
            ×
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Meals() {
  // ================= Filters =================
  const [typeInputVal, setTypeInputVal] = useState<string | undefined>();

  // ================= Data =================
  const [meals, setMeals] = useState<any[]>([]);

  // ================= Pagination =================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  const totalPages = Math.ceil(totalCount / limit);
  const isFilterDirty = Boolean(typeInputVal);

  // ================= Ingredient Options =================
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]);

  // ================= Create Modal =================
  const [showModal, setShowModal] = useState(false);

  const [mealName, setMealName] = useState('');
  const [mealUrl, setMealUrl] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<number[]>(
    [],
  );

  const [ingredientSearch, setIngredientSearch] = useState('');
  const [creatingIngredient, setCreatingIngredient] = useState(false);

  // ================= Edit Modal =================
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);

  const [editMealName, setEditMealName] = useState('');
  const [editMealUrl, setEditMealUrl] = useState('');
  const [editTypes, setEditTypes] = useState<string[]>([]);
  const [editIngredientIds, setEditIngredientIds] = useState<number[]>([]);

  const [editIngredientSearch, setEditIngredientSearch] = useState('');
  const [creatingEditIngredient, setCreatingEditIngredient] = useState(false);

  // ================= Delete Modal =================
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  /* ===================================================== */
  /* ================= Fetch Meals ======================== */
  /* ===================================================== */
  const fetchMeals = async (page: number, type?: string) => {
    const params: any = { page, limit };
    if (type) params.type = type;

    try {
      const res = await axios.get('/meals', { params });

      setMeals(res.data.meals || []);
      setTotalCount(res.data.mealsTotalCount || 0);
      setCurrentPage(res.data.currPage || page);
    } catch (err) {
      console.error('Error fetching meals:', err);
      setMeals([]);
      setTotalCount(0);
    }
  };

  /* ===================================================== */
  /* ================= Fetch Ingredients ================== */
  /* ===================================================== */
  const fetchIngredients = async () => {
    try {
      const res = await axios.get('/ingredients');
      setIngredientOptions(res.data || []);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setIngredientOptions([]);
    }
  };

  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
    // eslint-disable-next-line
  }, [currentPage]);

  useEffect(() => {
    fetchIngredients();
  }, []);

  /* ===================================================== */
  /* ================= Create Ingredient ================== */
  /* ===================================================== */
  const handleCreateIngredient = async () => {
    if (!ingredientSearch.trim()) return;

    try {
      setCreatingIngredient(true);

      const res = await axios.post('/ingredients', {
        name: ingredientSearch.trim(),
      });

      const newIngredient = res.data;

      setIngredientOptions((prev) => [...prev, newIngredient]);
      setSelectedIngredientIds((prev) => [...prev, newIngredient.id]);

      setIngredientSearch('');
    } finally {
      setCreatingIngredient(false);
    }
  };

  const handleCreateIngredientInEdit = async () => {
    if (!editIngredientSearch.trim()) return;

    try {
      setCreatingEditIngredient(true);

      const res = await axios.post('/ingredients', {
        name: editIngredientSearch.trim(),
      });

      const newIngredient = res.data;

      setIngredientOptions((prev) => [...prev, newIngredient]);
      setEditIngredientIds((prev) => [...prev, newIngredient.id]);

      setEditIngredientSearch('');
    } finally {
      setCreatingEditIngredient(false);
    }
  };

  /* ===================================================== */
  /* ================= Create Meal ======================== */
  /* ===================================================== */
  const handleCreateMeal = async () => {
    await axios.post('/meals', {
      name: mealName,
      url: mealUrl,
      types: selectedTypes,
      ingredientIds: selectedIngredientIds,
    });

    setShowModal(false);

    setMealName('');
    setMealUrl('');
    setSelectedTypes([]);
    setSelectedIngredientIds([]);
    setIngredientSearch('');

    fetchMeals(1);
  };

  /* ===================================================== */
  /* ================= Edit Meal ========================== */
  /* ===================================================== */
  const openEditModal = (meal: any) => {
    setEditingMeal(meal);

    setEditMealName(meal.name);
    setEditMealUrl(meal.url || '');

    setEditTypes(meal.types?.map((t: any) => t.name) || []);
    setEditIngredientIds(meal.ingredients?.map((i: any) => i.id) || []);

    setEditIngredientSearch('');
    setShowEditModal(true);
  };

  const handleUpdateMeal = async () => {
    await axios.put(`/meals/${editingMeal.id}`, {
      name: editMealName,
      url: editMealUrl,
      types: editTypes,
      ingredientIds: editIngredientIds,
    });

    setShowEditModal(false);
    fetchMeals(currentPage);
  };

  /* ===================================================== */
  /* ================= Delete Meal ======================== */
  /* ===================================================== */
  const openDeleteModal = (meal: any) => {
    setSelectedMeal(meal);
    setShowDeleteModal(true);
  };

  const handleDeleteMeal = async () => {
    await axios.delete(`/meals/${selectedMeal.id}`);
    setShowDeleteModal(false);
    fetchMeals(currentPage);
  };

  /* ===================================================== */
  /* ================= Ingredient Filters ================= */
  /* ===================================================== */
  const filteredIngredients = ingredientOptions.filter((ing) =>
    ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()),
  );

  const filteredEditIngredients = ingredientOptions.filter((ing) =>
    ing.name.toLowerCase().includes(editIngredientSearch.toLowerCase()),
  );

  /* ===================================================== */
  /* ================= Render ============================= */
  /* ===================================================== */
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
          onClick={() => {
            setTypeInputVal(undefined);
            setCurrentPage(1);
            fetchMeals(1);
          }}
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
          {meals.map((meal, index) => (
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

              <td>
                <Button size='sm' onClick={() => openEditModal(meal)}>
                  Edit
                </Button>{' '}
                <Button
                  size='sm'
                  variant='danger'
                  onClick={() => openDeleteModal(meal)}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
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

      {/* ===================================================== */}
      {/* ================= Create Modal ====================== */}
      {/* ===================================================== */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Meal</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Control
              placeholder='Meal Name'
              className='mb-2'
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />

            <Form.Control
              placeholder='Meal URL'
              className='mb-3'
              value={mealUrl}
              onChange={(e) => setMealUrl(e.target.value)}
            />

            {/* Types */}
            <Form.Label>Meal Types</Form.Label>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '15px',
              }}
            >
              {ALL_TYPES.map((t) => (
                <Button
                  key={t}
                  size='sm'
                  variant={
                    selectedTypes.includes(t) ? 'primary' : 'outline-secondary'
                  }
                  style={{ borderRadius: '20px', padding: '4px 14px' }}
                  onClick={() =>
                    setSelectedTypes((prev) =>
                      prev.includes(t)
                        ? prev.filter((x) => x !== t)
                        : [...prev, t],
                    )
                  }
                >
                  {t}
                </Button>
              ))}
            </div>

            {/* Ingredients */}
            <Form.Label>Ingredients</Form.Label>

            <IngredientTags
              ids={selectedIngredientIds}
              options={ingredientOptions}
              onRemove={(id) =>
                setSelectedIngredientIds((prev) => prev.filter((x) => x !== id))
              }
            />

            <Form.Control
              className='mt-2'
              placeholder='Search or create ingredient...'
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
            />

            <div
              style={{
                marginTop: '10px',
                border: '1px solid #eee',
                borderRadius: '12px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '8px',
                background: '#fafafa',
              }}
            >
              {filteredIngredients.length === 0 ? (
                <Button
                  size='sm'
                  variant='outline-success'
                  disabled={creatingIngredient}
                  onClick={handleCreateIngredient}
                >
                  + Create "{ingredientSearch}"
                </Button>
              ) : (
                filteredIngredients.map((ing) => (
                  <div
                    key={ing.id}
                    onClick={() =>
                      setSelectedIngredientIds((prev) =>
                        prev.includes(ing.id)
                          ? prev.filter((x) => x !== ing.id)
                          : [...prev, ing.id],
                      )
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: selectedIngredientIds.includes(ing.id)
                        ? '#dbeafe'
                        : 'transparent',
                      marginBottom: '4px',
                    }}
                  >
                    {ing.name}
                  </div>
                ))
              )}
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant='success' onClick={handleCreateMeal}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================== */}
      {/* ================= Edit Modal ======================== */}
      {/* ===================================================== */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Meal</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Control
              className='mb-2'
              value={editMealName}
              onChange={(e) => setEditMealName(e.target.value)}
            />

            <Form.Control
              className='mb-3'
              value={editMealUrl}
              onChange={(e) => setEditMealUrl(e.target.value)}
            />

            {/* Types */}
            <Form.Label>Meal Types</Form.Label>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '15px',
              }}
            >
              {ALL_TYPES.map((t) => (
                <Button
                  key={t}
                  size='sm'
                  variant={
                    editTypes.includes(t) ? 'primary' : 'outline-secondary'
                  }
                  style={{ borderRadius: '20px', padding: '4px 14px' }}
                  onClick={() =>
                    setEditTypes((prev) =>
                      prev.includes(t)
                        ? prev.filter((x) => x !== t)
                        : [...prev, t],
                    )
                  }
                >
                  {t}
                </Button>
              ))}
            </div>

            {/* Ingredients */}
            <Form.Label>Ingredients</Form.Label>

            <IngredientTags
              ids={editIngredientIds}
              options={ingredientOptions}
              onRemove={(id) =>
                setEditIngredientIds((prev) => prev.filter((x) => x !== id))
              }
            />

            <Form.Control
              className='mt-2'
              placeholder='Search or create ingredient...'
              value={editIngredientSearch}
              onChange={(e) => setEditIngredientSearch(e.target.value)}
            />

            <div
              style={{
                marginTop: '10px',
                border: '1px solid #eee',
                borderRadius: '12px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '8px',
                background: '#fafafa',
              }}
            >
              {filteredEditIngredients.length === 0 ? (
                <Button
                  size='sm'
                  variant='outline-success'
                  disabled={creatingEditIngredient}
                  onClick={handleCreateIngredientInEdit}
                >
                  + Create "{editIngredientSearch}"
                </Button>
              ) : (
                filteredEditIngredients.map((ing) => (
                  <div
                    key={ing.id}
                    onClick={() =>
                      setEditIngredientIds((prev) =>
                        prev.includes(ing.id)
                          ? prev.filter((x) => x !== ing.id)
                          : [...prev, ing.id],
                      )
                    }
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: editIngredientIds.includes(ing.id)
                        ? '#dbeafe'
                        : 'transparent',
                      marginBottom: '4px',
                    }}
                  >
                    {ing.name}
                  </div>
                ))
              )}
            </div>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant='success' onClick={handleUpdateMeal}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================== */}
      {/* ================= Delete Modal ====================== */}
      {/* ===================================================== */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Meal</Modal.Title>
        </Modal.Header>

        <Modal.Body>Are you sure you want to delete this meal?</Modal.Body>

        <Modal.Footer>
          <Button variant='danger' onClick={handleDeleteMeal}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
