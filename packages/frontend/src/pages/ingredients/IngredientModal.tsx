import { Modal, Button, Form } from 'react-bootstrap';

export default function IngredientModal({
  show,
  name,
  setName,
  editing,
  onClose,
  onSave,
}: any) {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {editing ? 'Edit Ingredient' : 'Create Ingredient'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>

      <Modal.Footer>
        <Button variant='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button variant='success' onClick={onSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
