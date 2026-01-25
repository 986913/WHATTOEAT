import { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import PageHeader from '../../components/PageHeader';
import AppToast from '../../components/AppToast';
import IngredientModal from './IngredientModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function Ingredients() {
  const [toastShow, setToastShow] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const notify = (msg: string) => {
    setToastMsg(msg);
    setToastShow(true);
  };

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);

  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchAll = async () => {
    const res = await axios.get('/ingredients');
    setIngredients(res.data);
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
      await axios.put(`/ingredients/${editing.id}`, { name });
      notify('Meal updated successfully ✏️');
    } else {
      await axios.post('/ingredients', { name });
      notify('Ingredient created successfully ✅');
    }

    setShowModal(false);
    fetchAll();
  };

  const confirmDelete = async () => {
    await axios.delete(`/ingredients/${deleteTarget.id}`);
    notify('Meal deleted successfully 🗑️');
    setDeleteTarget(null);
    fetchAll();
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
        show={toastShow}
        message={toastMsg}
        onClose={() => setToastShow(false)}
      />
    </div>
  );
}
