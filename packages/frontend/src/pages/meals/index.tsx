import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import IngredientSelector from '../../components/IngredientSelector';
import ConfirmModal from '../../components/ConfirmModal';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button, Form } from 'react-bootstrap';

const DEFAULT_LIMIT = 10;
const ALL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

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
  /* ================= Render ============================= */
  /* ===================================================== */
  return (
    <div className='page'>
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

            {/* Ingredients */}
            <Form.Label>Ingredients</Form.Label>

            <IngredientSelector
              options={ingredientOptions}
              selectedIds={selectedIngredientIds}
              setSelectedIds={setSelectedIngredientIds}
              search={ingredientSearch}
              setSearch={setIngredientSearch}
              creating={creatingIngredient}
              onCreateIngredient={handleCreateIngredient}
            />
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

            {/* Ingredients */}
            <Form.Label>Ingredients</Form.Label>

            <IngredientSelector
              options={ingredientOptions}
              selectedIds={editIngredientIds}
              setSelectedIds={setEditIngredientIds}
              search={editIngredientSearch}
              setSearch={setEditIngredientSearch}
              creating={creatingEditIngredient}
              onCreateIngredient={handleCreateIngredientInEdit}
            />
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
      <ConfirmModal
        show={!!selectedMeal}
        title='Delete Meal'
        message='Are you sure?'
        onCancel={() => setSelectedMeal(null)}
        onConfirm={handleDeleteMeal}
      />
    </div>
  );
}
