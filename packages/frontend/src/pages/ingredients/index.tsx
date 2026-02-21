import { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import PageHeader from '../../components/PageHeader';
import AppToast from '../../components/AppToast';
import IngredientModal from './IngredientModal';
import { useToast } from '../../hooks/useToast';
import ConfirmModal from '../../components/ConfirmModal';
import { isAxiosError } from 'axios';

export default function Ingredients() {
  const { toast, success, error } = useToast();

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchAll = async () => {
    try {
      const res = await axios.get('/ingredients');
      setIngredients(res.data || []);
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Fetch Ingredients failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error fetching ingredients:', msg);
      setIngredients([]);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setShowModal(true);
  };

  const openEdit = (ing: any) => {
    setEditing(ing);
    setName(ing.name);
    setShowModal(true);
  };

  const save = async () => {
    if (editing) {
      try {
        await axios.put(`/ingredients/${editing.id}`, { name });
        success('Ingredient updated successfully ✏️');
      } catch (err: any) {
        const msg =
          err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
        if (isAxiosError(err)) {
          error(`Updating Ingredients failed ❌, reason: ${msg}`);
        } else {
          error('❌ Unexpected error');
        }
        console.error('Error Updating ingredient:', msg);
      }
    } else {
      try {
        await axios.post('/ingredients', { name });
        success('Ingredient created successfully ✅');
      } catch (err: any) {
        const msg =
          err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
        if (isAxiosError(err)) {
          error(`Creating Ingredients failed ❌, reason: ${msg}`);
        } else {
          error('❌ Unexpected error');
        }
        console.error('Error Creating ingredient:', msg);
      }
    }

    setShowModal(false);
    fetchAll();
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/ingredients/${deleteTarget.id}`);
      success('Ingredient deleted successfully 🗑️');
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      const msg =
        err.response?.data?.mysqlErrMsg || err?.response?.data?.errorMessage;
      if (isAxiosError(err)) {
        error(`Delete Ingredients failed ❌, reason: ${msg}`);
      } else {
        error('❌ Unexpected error');
      }
      console.error('Error deleting ingredient:', msg);
    }
  };

  return (
    <div className='page'>
      <PageHeader
        title='Ingredients'
        action={
          <Button variant='success' onClick={openCreate}>
            + Create Ingredient
          </Button>
        }
      />

      <div className='table-wrapper'>
        <Table hover bordered>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th style={{ width: '180px' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.id}>
                <td>{ing.id}</td>
                <td>{ing.name}</td>
                <td>
                  <Button size='sm' onClick={() => openEdit(ing)}>
                    Edit
                  </Button>{' '}
                  <Button
                    size='sm'
                    variant='danger'
                    onClick={() => setDeleteTarget(ing)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Modal */}
      <IngredientModal
        show={showModal}
        name={name}
        setName={setName}
        editing={editing}
        onClose={() => setShowModal(false)}
        onSave={save}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        show={!!deleteTarget}
        title='Delete Ingredient'
        message='Are you sure you want to delete this ingredient ?'
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
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
