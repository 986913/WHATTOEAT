import { Modal, Button, Form } from 'react-bootstrap';
import TypeSelector from './TypeSelector';
import IngredientSelector from './IngredientSelector';

export const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealFormModalProps {
  show: boolean;
  title: string;
  submitText: string;
  isSubmitDisabled: boolean;
  onHide: () => void;
  onSubmit: () => void;

  name: string;
  setName: (v: string) => void;

  videoUrl: string;
  setVideoUrl: (v: string) => void;

  imageUrl: string;
  setImageUrl: (v: string) => void;

  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;

  ingredientOptions: any[];
  selectedIngredientIds: number[];
  setSelectedIngredientIds: (ids: number[]) => void;
  ingredientSearch: string;
  setIngredientSearch: (v: string) => void;
  creating: boolean;
  onCreateIngredient: () => void;
}

export default function MealFormModal({
  show,
  title,
  submitText,
  isSubmitDisabled,
  onHide,
  onSubmit,
  name,
  setName,
  videoUrl,
  setVideoUrl,
  imageUrl,
  setImageUrl,
  selectedTypes,
  setSelectedTypes,
  ingredientOptions,
  selectedIngredientIds,
  setSelectedIngredientIds,
  ingredientSearch,
  setIngredientSearch,
  creating,
  onCreateIngredient,
}: MealFormModalProps) {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {name.trim() === '' && (
            <div className='text-warning small'>Meal name is required</div>
          )}
          <Form.Control
            placeholder='Meal Name (e.g. Tomato Egg Stir Fry)'
            className='mb-2'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Form.Control
            className='mb-2'
            value={videoUrl}
            placeholder='YouTube cooking tutorial link'
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <Form.Text className='text-muted d-block mb-3' style={{ fontSize: 12, marginTop: -4 }}>
            Paste a YouTube link so others can learn how to cook this dish
          </Form.Text>

          <Form.Control
            className='mb-2'
            value={imageUrl}
            placeholder='Meal photo URL (what the dish looks like)'
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Form.Text className='text-muted d-block mb-3' style={{ fontSize: 12, marginTop: -4 }}>
            A preview image helps identify this meal during shuffle
          </Form.Text>

          <Form.Label>Meal Types</Form.Label>
          {selectedTypes.length === 0 && (
            <div className='text-warning small'>Select at least one type</div>
          )}
          <TypeSelector
            allTypes={ALL_MEAL_TYPES}
            selected={selectedTypes}
            setSelected={setSelectedTypes}
          />

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
            creating={creating}
            onCreateIngredient={onCreateIngredient}
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant='success' onClick={onSubmit} disabled={isSubmitDisabled}>
          {submitText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
