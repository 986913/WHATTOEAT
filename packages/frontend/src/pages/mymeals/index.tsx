import { useEffect, useState, useMemo } from 'react';
import '../../styles/pages/mymeals.css';
import { isAxiosError } from 'axios';
import axios from '../../utils/axios';
import { useToast } from '../../hooks/useToast';
import AppToast from '../../components/AppToast';
import ConfirmModal from '../../components/ConfirmModal';
import AppPagination from '../../components/AppPagination';
import MealFormModal, { ALL_MEAL_TYPES } from '../../components/MealFormModal';
import { Button } from 'react-bootstrap';

const DEFAULT_LIMIT = 12;
const API_BASE = '/meals/me';

const TYPE_ICON: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍝',
  snack: '🍪',
};

export default function MyMeals() {
  const { toast, success, error } = useToast();

  const [typeInputVal, setTypeInputVal] = useState<string | undefined>();
  const [meals, setMeals] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);
  const [hasEverLoaded, setHasEverLoaded] = useState(false);
  // Track unfiltered total so filters stay visible when filtering yields 0
  const [totalUnfiltered, setTotalUnfiltered] = useState(0);

  const totalPages = Math.ceil(totalCount / limit);
  const hasAnyMeals = totalUnfiltered > 0;

  // Ingredient options
  const [ingredientOptions, setIngredientOptions] = useState<any[]>([]);

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealVideoUrl, setMealVideoUrl] = useState('');
  const [mealImageUrl, setMealImageUrl] = useState('');
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

  // Edit modal state
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

  // Fix #4: Edit dirty check — only enable Save when something actually changed
  const isEditDirty = useMemo(() => {
    if (!editingMeal) return false;
    const origTypes = (editingMeal.types?.map((t: any) => t.name) || []).sort();
    const currTypes = [...editTypes].sort();
    const origIngs = (
      editingMeal.ingredients?.map((i: any) => i.id) || []
    ).sort();
    const currIngs = [...editIngredientIds].sort();
    return (
      editMealName !== (editingMeal.name || '') ||
      editMealVideoUrl !== (editingMeal.videoUrl || '') ||
      editMealImageUrl !== (editingMeal.imageUrl || '') ||
      JSON.stringify(origTypes) !== JSON.stringify(currTypes) ||
      JSON.stringify(origIngs) !== JSON.stringify(currIngs)
    );
  }, [
    editingMeal,
    editMealName,
    editMealVideoUrl,
    editMealImageUrl,
    editTypes,
    editIngredientIds,
  ]);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  const fetchMeals = async (page: number, type?: string) => {
    const params: any = { page, limit };
    if (type) params.type = type;
    try {
      const res = await axios.get(API_BASE, { params });
      setMeals(res.data.meals || []);
      setTotalCount(res.data.mealsTotalCount || 0);
      setCurrentPage(res.data.currPage || page);
      // Track unfiltered total: only update when not filtering
      if (!type) setTotalUnfiltered(res.data.mealsTotalCount || 0);
      setHasEverLoaded(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) error(`Fetch meals failed: ${msg}`);
      else error('Unexpected error');
      setMeals([]);
      setTotalCount(0);
      setHasEverLoaded(true);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await axios.get('/ingredients');
      setIngredientOptions(res.data || []);
    } catch {
      setIngredientOptions([]);
    }
  };

  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
  }, [currentPage]); // eslint-disable-line
  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleCreateIngredient = async () => {
    if (!ingredientSearch.trim()) return;
    try {
      setCreatingIngredient(true);
      const res = await axios.post('/ingredients', {
        name: ingredientSearch.trim(),
      });
      setIngredientOptions((prev) => [...prev, res.data]);
      setSelectedIngredientIds((prev) => [...prev, res.data.id]);
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
      setIngredientOptions((prev) => [...prev, res.data]);
      setEditIngredientIds((prev) => [...prev, res.data.id]);
      setEditIngredientSearch('');
    } finally {
      setCreatingEditIngredient(false);
    }
  };

  const handleCreateMeal = async () => {
    try {
      await axios.post(API_BASE, {
        name: mealName,
        videoUrl: mealVideoUrl,
        imageUrl: mealImageUrl,
        types: selectedTypes,
        ingredientIds: selectedIngredientIds,
      });
      setShowModal(false);
      success('Meal created successfully');
      setMealName('');
      setMealVideoUrl('');
      setMealImageUrl('');
      setSelectedTypes([]);
      setSelectedIngredientIds([]);
      setIngredientSearch('');
      fetchMeals(1);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) error(`Create meal failed: ${msg}`);
      else error('Unexpected error');
    }
  };

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
      await axios.put(`${API_BASE}/${editingMeal.id}`, {
        name: editMealName,
        videoUrl: editMealVideoUrl,
        imageUrl: editMealImageUrl,
        types: editTypes,
        ingredientIds: editIngredientIds,
      });
      setShowEditModal(false);
      success('Meal updated successfully');
      fetchMeals(currentPage);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) error(`Update meal failed: ${msg}`);
      else error('Unexpected error');
    }
  };

  // Fix #2 & #3: close modal properly
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedMeal(null);
  };

  const handleDeleteMeal = async () => {
    try {
      await axios.delete(`${API_BASE}/${selectedMeal.id}`);
      closeDeleteModal();
      success('Meal deleted successfully');
      fetchMeals(currentPage);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) error(`Delete meal failed: ${msg}`);
      else error('Unexpected error');
    }
  };

  const PLACEHOLDER_IMG =
    'https://thetac.tech/wp-content/uploads/2024/09/placeholder-288.png';

  return (
    <div className='page custom-meals-page'>
      {/* Header */}
      <div className='cm-header'>
        <div>
          <h1 className='cm-title'>Custom Meals</h1>
          <p className='cm-subtitle'>
            Create and manage your own meals. They'll join the shuffle rotation
            just for you.
          </p>
        </div>
        {/* Fix #5: only show header button when user already has meals */}
        {hasAnyMeals && (
          <Button className='cm-create-btn' onClick={() => setShowModal(true)}>
            <i className='fa-solid fa-plus' /> New Meal
          </Button>
        )}
      </div>

      {/* Fix #1: Filters — show when user has any meals (unfiltered), chips toggle on/off */}
      {hasEverLoaded && hasAnyMeals && (
        <div className='cm-filters'>
          <button
            className={`cm-filter-chip ${!typeInputVal ? 'active' : ''}`}
            onClick={() => {
              setTypeInputVal(undefined);
              setCurrentPage(1);
              fetchMeals(1);
            }}
          >
            All
          </button>
          {ALL_MEAL_TYPES.map((t) => (
            <button
              key={t}
              className={`cm-filter-chip ${typeInputVal === t ? 'active' : ''}`}
              onClick={() => {
                setTypeInputVal(t);
                setCurrentPage(1);
                fetchMeals(1, t);
              }}
            >
              {TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {hasEverLoaded && meals.length === 0 && !typeInputVal ? (
        <div className='cm-empty'>
          <div className='cm-empty-icon'>🍽️</div>
          <h3>No custom meals yet</h3>
          <p>
            Create your first meal and it will appear in your shuffle rotation.
          </p>
          <Button className='cm-create-btn' onClick={() => setShowModal(true)}>
            <i className='fa-solid fa-plus' /> Create Your First Meal
          </Button>
        </div>
      ) : hasEverLoaded && meals.length === 0 && typeInputVal ? (
        <div className='cm-empty'>
          <p className='text-muted'>No meals found for this type.</p>
        </div>
      ) : (
        <div className='cm-grid'>
          {meals.map((meal) => (
            <div key={meal.id} className='cm-card'>
              <div className='cm-card-img-wrap'>
                <img
                  className='cm-card-img'
                  src={meal.imageUrl || PLACEHOLDER_IMG}
                  alt={meal.name}
                />
                {meal.videoUrl && (
                  <a
                    className='cm-card-video-badge'
                    href={meal.videoUrl}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className='fa-solid fa-play' /> Video
                  </a>
                )}
              </div>

              <div className='cm-card-body'>
                <h4 className='cm-card-name'>{meal.name}</h4>

                <div className='cm-card-types'>
                  {meal.types?.map((t: any) => (
                    <span key={t.id} className='cm-type-tag'>
                      {TYPE_ICON[t.name] || ''} {t.name}
                    </span>
                  ))}
                </div>

                <div className='cm-card-ingredients'>
                  {meal.ingredients?.slice(0, 5).map((i: any) => (
                    <span key={i.id} className='cm-ing-tag'>
                      {i.name}
                    </span>
                  ))}
                  {meal.ingredients?.length > 5 && (
                    <span className='cm-ing-tag cm-ing-more'>
                      +{meal.ingredients.length - 5}
                    </span>
                  )}
                </div>

                <div className='cm-card-actions'>
                  <button
                    className='cm-action-btn cm-action-edit'
                    onClick={() => openEditModal(meal)}
                  >
                    <i className='fa-solid fa-pen' /> Edit
                  </button>
                  <button
                    className='cm-action-btn cm-action-delete'
                    onClick={() => {
                      setSelectedMeal(meal);
                      setShowDeleteModal(true);
                    }}
                  >
                    <i className='fa-solid fa-trash' /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <AppPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Create Modal */}
      <MealFormModal
        show={showModal}
        title='Create Meal'
        submitText='Create'
        isSubmitDisabled={!isCreateFormValid}
        onHide={() => setShowModal(false)}
        onSubmit={handleCreateMeal}
        name={mealName}
        setName={setMealName}
        videoUrl={mealVideoUrl}
        setVideoUrl={setMealVideoUrl}
        imageUrl={mealImageUrl}
        setImageUrl={setMealImageUrl}
        selectedTypes={selectedTypes}
        setSelectedTypes={setSelectedTypes}
        ingredientOptions={ingredientOptions}
        selectedIngredientIds={selectedIngredientIds}
        setSelectedIngredientIds={setSelectedIngredientIds}
        ingredientSearch={ingredientSearch}
        setIngredientSearch={setIngredientSearch}
        creating={creatingIngredient}
        onCreateIngredient={handleCreateIngredient}
      />

      {/* Edit Modal — Fix #4: disabled when not dirty */}
      <MealFormModal
        show={showEditModal}
        title='Edit Meal'
        submitText='Save Changes'
        isSubmitDisabled={!isEditFormValid || !isEditDirty}
        onHide={() => setShowEditModal(false)}
        onSubmit={handleUpdateMeal}
        name={editMealName}
        setName={setEditMealName}
        videoUrl={editMealVideoUrl}
        setVideoUrl={setEditMealVideoUrl}
        imageUrl={editMealImageUrl}
        setImageUrl={setEditMealImageUrl}
        selectedTypes={editTypes}
        setSelectedTypes={setEditTypes}
        ingredientOptions={ingredientOptions}
        selectedIngredientIds={editIngredientIds}
        setSelectedIngredientIds={setEditIngredientIds}
        ingredientSearch={editIngredientSearch}
        setIngredientSearch={setEditIngredientSearch}
        creating={creatingEditIngredient}
        onCreateIngredient={handleCreateIngredientInEdit}
      />

      {/* Delete Modal — Fix #2 & #3: proper cancel handler */}
      <ConfirmModal
        show={showDeleteModal}
        title='Delete Meal'
        message='Are you sure you want to delete this meal? It will be removed from future shuffles.'
        onCancel={closeDeleteModal}
        onConfirm={handleDeleteMeal}
      />

      <AppToast {...toast} />
    </div>
  );
}
