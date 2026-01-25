import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios';

import Table from 'react-bootstrap/Table';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');

  /* -----------------------------
     Fetch All Ingredients
  ------------------------------*/
  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/ingredients');
      setIngredients(res.data);
    } catch (err) {
      console.error('Failed to fetch ingredients', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  /* -----------------------------
     Open Create Modal
  ------------------------------*/
  const handleCreate = () => {
    setEditingIngredient(null);
    setName('');
    setShowModal(true);
  };

  /* -----------------------------
     Open Edit Modal
  ------------------------------*/
  const handleEdit = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setName(ingredient.name);
    setShowModal(true);
  };

  /* -----------------------------
     Save (Create or Update)
  ------------------------------*/
  const handleSave = async () => {
    try {
      if (editingIngredient) {
        // Update
        await axios.put(`/ingredients/${editingIngredient.id}`, {
          name,
        });
      } else {
        // Create
        await axios.post('/ingredients', { name });
      }

      setShowModal(false);
      fetchIngredients();
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  /* -----------------------------
     Delete Ingredient
  ------------------------------*/
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this ingredient?'))
      return;

    try {
      await axios.delete(`/ingredients/${id}`);
      fetchIngredients();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      {/* Header */}
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h2>Ingredients</h2>

        {/* Create Button */}
        <Button variant='success' onClick={handleCreate}>
          + Create Ingredient
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner animation='border' />
      ) : (
        <Table bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th style={{ width: '200px' }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.id}>
                <td>{ing.id}</td>
                <td>{ing.name}</td>

                <td>
                  <Button
                    variant='primary'
                    size='sm'
                    className='me-2'
                    onClick={() => handleEdit(ing)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant='danger'
                    size='sm'
                    onClick={() => handleDelete(ing.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingIngredient ? 'Edit Ingredient' : 'Create Ingredient'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group>
            <Form.Label>Ingredient Name</Form.Label>
            <Form.Control
              type='text'
              value={name}
              placeholder='e.g. tomato'
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowModal(false)}>
            Cancel
          </Button>

          <Button variant='success' onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
