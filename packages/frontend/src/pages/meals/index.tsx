import { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import { isAxiosError } from 'axios';
import axios from '../../utils/axios';
import TypeSelector from '../../components/TypeSelector';
import { useToast } from '../../hooks/useToast';
import AppToast from '../../components/AppToast';
import IngredientSelector from '../../components/IngredientSelector';
import ConfirmModal from '../../components/ConfirmModal';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button, Form } from 'react-bootstrap';

const DEFAULT_LIMIT = 10;
const ALL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Meals() {
  const { toast, success, error } = useToast();

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
  const isCreateFormValid =
    mealName.trim() !== '' &&
    selectedTypes.length > 0 &&
    selectedIngredientIds.length > 0;

  // ================= Edit Modal =================
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);

  const [editMealName, setEditMealName] = useState('');
  const [editMealVideoUrl, setEditMealVideoUrl] = useState('');
  const [editMealImageUrl, setEditMealImageUrl] = useState('');
  const [editTypes, setEditTypes] = useState<string[]>([]);
  const [editIngredientIds, setEditIngredientIds] = useState<number[]>([]);

  const [editIngredientSearch, setEditIngredientSearch] = useState('');
  const [creatingEditIngredient, setCreatingEditIngredient] = useState(false);
  const isEditFormValid =
    editMealName.trim() !== '' &&
    editTypes.length > 0 &&
    editIngredientIds.length > 0;

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
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Fetch Meal failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error fetching meals:', msg);
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
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Fetch Ingredients failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error fetching ingredients:', msg);
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
    try {
      await axios.post('/meals', {
        name: mealName,
        url: mealUrl,
        types: selectedTypes,
        ingredientIds: selectedIngredientIds,
      });
      setShowModal(false);
      success('Meal created successfully ✅');
      setMealName('');
      setMealUrl('');
      setSelectedTypes([]);
      setSelectedIngredientIds([]);
      setIngredientSearch('');

      fetchMeals(1);
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Meal created failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
    }
  };

  /* ===================================================== */
  /* ================= Edit Meal ========================== */
  /* ===================================================== */
  const openEditModal = (meal: any) => {
    setEditingMeal(meal);

    setEditMealName(meal.name);
    setEditMealVideoUrl(meal.videoUrl || '');
    setEditMealImageUrl(meal.imageUrl || '');

    setEditTypes(meal.types?.map((t: any) => t.name) || []);
    setEditIngredientIds(meal.ingredients?.map((i: any) => i.id) || []);

    setEditIngredientSearch('');
    setShowEditModal(true);
  };

  const handleUpdateMeal = async () => {
    try {
      await axios.put(`/meals/${editingMeal.id}`, {
        name: editMealName,
        videoUrl: editMealVideoUrl,
        imageUrl: editMealImageUrl,
        types: editTypes,
        ingredientIds: editIngredientIds,
      });

      setShowEditModal(false);
      success('Meal updated successfully ✏️');
      fetchMeals(currentPage);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Update Meal failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error Updating Meal:', msg);
    }
  };

  /* ===================================================== */
  /* ================= Delete Meal ======================== */
  /* ===================================================== */
  const openDeleteModal = (meal: any) => {
    setSelectedMeal(meal);
    setShowDeleteModal(true);
  };

  const handleDeleteMeal = async () => {
    try {
      await axios.delete(`/meals/${selectedMeal.id}`);
      setShowDeleteModal(false);
      success('Meal deleted successfully 🗑️');
      fetchMeals(currentPage);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Delete Meal failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error Deleting Meal:', msg);
    }
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
            className={`btn-search ${isFilterDirty ? 'active' : 'disabled'}`}
            disabled={!isFilterDirty}
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
                {meal.videoUrl ? (
                  <a href={meal.videoUrl} target='_blank' rel='noreferrer'>
                    Link
                  </a>
                ) : (
                  '-'
                )}
              </td>

              <td>{meal.types?.map((t: any) => t.name).join(', ')}</td>
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
            {mealName.trim() === '' && (
              <div className='text-warning small'>Meal name is required</div>
            )}

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

            <Form.Label>Meal Types</Form.Label>

            {selectedTypes.length === 0 && (
              <div className='text-warning small'>Select at least one type</div>
            )}
            <TypeSelector
              allTypes={ALL_TYPES}
              selected={selectedTypes}
              setSelected={setSelectedTypes}
            />

            {/* Ingredients */}
            <Form.Label>Ingredients</Form.Label>
            {selectedIngredientIds.length === 0 && (
              <div className='text-warning small'>
                Select at least one ingredient
              </div>
            )}
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
          <Button
            variant='success'
            onClick={handleCreateMeal}
            disabled={!isCreateFormValid}
          >
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
            {editMealName.trim() === '' && (
              <div className='text-warning small'>Meal name is required</div>
            )}

            <Form.Control
              className='mb-2'
              value={editMealName}
              onChange={(e) => setEditMealName(e.target.value)}
            />

            <Form.Control
              className='mb-3'
              value={editMealVideoUrl}
              placeholder='Enter Cooking Video URL'
              onChange={(e) => setEditMealVideoUrl(e.target.value)}
            />

            <Form.Control
              className='mb-3'
              value={editMealImageUrl}
              placeholder='Enter Preview Image URL'
              onChange={(e) => setEditMealImageUrl(e.target.value)}
            />

            <Form.Label>Meal Types</Form.Label>
            {editTypes.length === 0 && (
              <div className='text-warning small'>Select at least one type</div>
            )}
            <TypeSelector
              allTypes={ALL_TYPES}
              selected={editTypes}
              setSelected={setEditTypes}
            />

            <Form.Label>Ingredients</Form.Label>
            {editIngredientIds.length === 0 && (
              <div className='text-warning small'>
                Select at least one ingredient
              </div>
            )}
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
          <Button
            variant='success'
            onClick={handleUpdateMeal}
            disabled={!isEditFormValid}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================== */}
      {/* ================= Delete Modal ====================== */}
      {/* ===================================================== */}
      <ConfirmModal
        show={!!showDeleteModal}
        title='Delete Meal'
        message='Are you sure you want to delete this meal ?'
        onCancel={() => setSelectedMeal(null)}
        onConfirm={handleDeleteMeal}
      />

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
