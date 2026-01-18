import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button, Form } from 'react-bootstrap';
import { GetUsersDTO } from '../../../../backend/src/user/dto/get-users.dto';

const DEFAULT_LIMIT = 10;
const PLACEHOLDER_AVATAR =
  'https://i.pinimg.com/736x/c9/b6/f4/c9b6f424a544f3e1fa9a6d73b170b79e.jpg';

export default function Users() {
  // ===== Filters =====
  const [userNameInputVal, setUserNameInputVal] = useState('');
  const [roleInputVal, setRoleInputVal] = useState('');
  const [genderInputVal, setGenderInputVal] = useState('');

  // ===== Data =====
  const [users, setUsers] = useState<any[]>([]);

  // ===== Pagination =====
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // ===== Derived state =====
  const isFilterDirty = Boolean(
    userNameInputVal || roleInputVal || genderInputVal,
  );

  // ===== Modal State =====
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ===== Edit Form State =====
  const [editUsername, setEditUsername] = useState('');
  const [editGender, setEditGender] = useState<'1' | '2'>('1');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editPhoto, setEditPhoto] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // ===== Derived state for Save button =====
  const isEditFormValid =
    editUsername.trim() !== '' &&
    editRoles.length > 0 &&
    editPhoto.trim() !== '' &&
    editAddress.trim() !== '';

  // ===== Fetch Users =====
  const fetchUsers = async (
    page: number,
    filters?: { username?: string; role?: string; gender?: string },
  ) => {
    const params: GetUsersDTO = { page, limit, ...filters };

    try {
      const res = await axios.get('/users', { params });
      setUsers(res.data.users);
      setTotalCount(res.data.usersTotalCount);
      setCurrentPage(res.data.currPage);
      setLimit(res.data.currLimit);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const filters = isFilterDirty
      ? {
          username: userNameInputVal,
          role: roleInputVal,
          gender: genderInputVal,
        }
      : undefined;
    fetchUsers(currentPage, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / limit);

  const clearAllFilters = async () => {
    setUserNameInputVal('');
    setRoleInputVal('');
    setGenderInputVal('');
    setCurrentPage(1);
    await fetchUsers(1, { username: '', role: '', gender: '' });
  };

  // ===== Open Modals =====
  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditGender(user.profile?.gender || '1');
    setEditRoles(
      user.roles?.map((r: any) => String(r.id)).filter(Boolean) || [],
    );
    setEditPhoto(user.profile?.photo || '');
    setEditAddress(user.profile?.address || '');
    setShowEditModal(true);
  };

  const openDeleteModal = (user: any) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // ===== Handle Edit Save (updateUser) =====
  const handleEditSave = async () => {
    if (!selectedUser) return;

    try {
      await axios.put(`/users/${selectedUser.id}`, {
        username: editUsername,
        profile: {
          address: editAddress,
          gender: editGender,
          photo: editPhoto,
        },
        roles: editRoles, // ['2', '3'] 字符串数组
      });

      setShowEditModal(false);
      alert('更新用户成功');
      fetchUsers(currentPage);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('更新用户失败，请检查控制台');
    }
  };

  // ===== Handle Delete =====
  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await axios.delete(`/users/${selectedUser.id}`);
      setShowDeleteModal(false);
      fetchUsers(currentPage);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('删除用户失败，请检查控制台');
    }
  };

  // ===== Toggle Role Checkbox =====
  const toggleRole = (roleId: string) => {
    setEditRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  return (
    <div className='users-page'>
      <h3 className='page-title'>Users</h3>

      {/* Filters */}
      <div className='filters-bar'>
        <div className='filters-left'>
          <input
            className='filter-input'
            placeholder='Username'
            value={userNameInputVal}
            onChange={(e) => setUserNameInputVal(e.target.value)}
          />

          <select
            className='filter-select'
            value={roleInputVal}
            onChange={(e) => setRoleInputVal(e.target.value)}
          >
            <option value=''>All Roles</option>
            <option value='1'>Admin</option>
            <option value='2'>Write</option>
            <option value='3'>ReadOnly</option>
          </select>

          <div className='filter-radio-group'>
            <label>
              <input
                type='radio'
                name='gender'
                value='1'
                checked={genderInputVal === '1'}
                onChange={(e) => setGenderInputVal(e.target.value)}
              />
              Female
            </label>

            <label>
              <input
                type='radio'
                name='gender'
                value='2'
                checked={genderInputVal === '2'}
                onChange={(e) => setGenderInputVal(e.target.value)}
              />
              Male
            </label>
          </div>

          <button
            className='btn-search'
            onClick={() =>
              fetchUsers(1, {
                username: userNameInputVal,
                role: roleInputVal,
                gender: genderInputVal,
              })
            }
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

      {/* Table */}
      <Table striped bordered hover className='users-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Photo</th>
            <th>Username</th>
            <th>Gender</th>
            <th>Roles</th>
            <th>Address</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={7} className='table-empty'>
                No Data
              </td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr key={user.id}>
                <td>{(currentPage - 1) * limit + index + 1}</td>

                <td>
                  <img
                    src={user?.profile?.photo || PLACEHOLDER_AVATAR}
                    alt='avatar'
                    className='user-avatar'
                  />
                </td>

                <td>{user.username}</td>

                <td>
                  {user.profile?.gender === '1'
                    ? 'Female'
                    : user.profile?.gender === '2'
                      ? 'Male'
                      : '-'}
                </td>

                <td>{user.roles.map((r: any) => r.roleName).join(', ')}</td>

                <td>{user.profile?.address || '-'}</td>

                <td>
                  <Button
                    variant='primary'
                    size='sm'
                    onClick={() => openEditModal(user)}
                  >
                    <i className='fa-regular fa-pen-to-square'></i> Edit
                  </Button>{' '}
                  <Button
                    variant='danger'
                    size='sm'
                    onClick={() => openDeleteModal(user)}
                  >
                    <i className='fa-solid fa-trash'></i> Delete
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Pagination */}
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

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className='mb-2'>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type='text'
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </Form.Group>

            <Form.Group className='mb-2'>
              <Form.Label>Gender</Form.Label>
              <div>
                <Form.Check
                  inline
                  type='radio'
                  label='Female'
                  value='1'
                  checked={editGender === '1'}
                  onChange={(e) => setEditGender(e.target.value as '1' | '2')}
                />
                <Form.Check
                  inline
                  type='radio'
                  label='Male'
                  value='2'
                  checked={editGender === '2'}
                  onChange={(e) => setEditGender(e.target.value as '1' | '2')}
                />
              </div>
            </Form.Group>

            <Form.Group className='mb-2'>
              <Form.Label>Roles</Form.Label>
              <div>
                <Form.Check
                  inline
                  type='checkbox'
                  label='Write'
                  checked={editRoles.includes('2')}
                  onChange={() => toggleRole('2')}
                />
                <Form.Check
                  inline
                  type='checkbox'
                  label='ReadOnly'
                  checked={editRoles.includes('3')}
                  onChange={() => toggleRole('3')}
                />
              </div>
            </Form.Group>

            <Form.Group className='mb-2'>
              <Form.Label>Photo URL</Form.Label>
              <Form.Control
                type='text'
                value={editPhoto}
                onChange={(e) => setEditPhoto(e.target.value)}
              />
            </Form.Group>

            <Form.Group className='mb-2'>
              <Form.Label>Address</Form.Label>
              <Form.Control
                type='text'
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button
            variant='primary'
            onClick={handleEditSave}
            disabled={!isEditFormValid} // ✅ 动态 Save 按钮
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete User</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this user?</Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant='danger' onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
