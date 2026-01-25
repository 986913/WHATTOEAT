import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Modal, Button } from 'react-bootstrap';
import UserFormModal from '../../components/UserFormModal';
import { GetUsersDTO } from '../../../../backend/src/user/dto/get-users.dto';
import { isAxiosError } from 'axios';

const DEFAULT_LIMIT = 10;
const PLACEHOLDER_AVATAR =
  'https://i.pinimg.com/736x/c9/b6/f4/c9b6f424a544f3e1fa9a6d73b170b79e.jpg';

export default function Users() {
  // ================= Filters =================
  const [userNameInputVal, setUserNameInputVal] = useState('');
  const [roleInputVal, setRoleInputVal] = useState('');
  const [genderInputVal, setGenderInputVal] = useState('');

  // ================= Data =================
  const [users, setUsers] = useState<any[]>([]);

  // ================= Pagination =================
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  // ================= Derived =================
  const isFilterDirty = Boolean(
    userNameInputVal || roleInputVal || genderInputVal,
  );

  const totalPages = Math.ceil(totalCount / limit);

  // ================= Modal State =================
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ================= Form State (Edit / Create 共用) =================
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editGender, setEditGender] = useState<'1' | '2'>('1');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editPhoto, setEditPhoto] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const isEditFormValid =
    editUsername.trim() !== '' &&
    editRoles.length > 0 &&
    editPhoto.trim() !== '' &&
    editAddress.trim() !== '' &&
    (showCreateModal ? editPassword.trim() !== '' : true);

  // ================= Fetch Users =================
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
    } catch (err) {
      console.error(err);
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

  const clearAllFilters = async () => {
    setUserNameInputVal('');
    setRoleInputVal('');
    setGenderInputVal('');
    setCurrentPage(1);
    await fetchUsers(1, { username: '', role: '', gender: '' });
  };

  // ================= Modal Open Helpers =================
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

  const openCreateModal = () => {
    setSelectedUser(null);
    setEditUsername('');
    setEditPassword('');
    setEditGender('1');
    setEditRoles([]);
    setEditPhoto('');
    setEditAddress('');
    setShowCreateModal(true);
  };

  const openDeleteModal = (user: any) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // ================= Handlers =================
  const toggleRole = (roleId: string) => {
    setEditRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;
    await axios.put(`/users/${selectedUser.id}`, {
      username: editUsername,
      profile: {
        address: editAddress,
        gender: editGender,
        photo: editPhoto,
      },
      roles: editRoles,
    });
    setShowEditModal(false);
    fetchUsers(currentPage);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    await axios.delete(`/users/${selectedUser.id}`);
    setShowDeleteModal(false);
    fetchUsers(currentPage);
  };

  const handleCreateSave = async () => {
    try {
      await axios.post('/users', {
        username: editUsername,
        password: editPassword,
        profile: {
          gender: editGender,
          photo: editPhoto,
          address: editAddress,
        },
        roles: editRoles, // ['2','3']
      });

      setShowCreateModal(false);
      setCurrentPage(1);
      fetchUsers(1);
    } catch (err) {
      if (isAxiosError(err)) {
        alert(err.response?.data?.message || err?.message);
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Unknown error');
      }
      console.error(err);
    }
  };

  // ================= Render =================
  return (
    <div className='page'>
      {/* Header */}
      <div className='page-header'>
        <h3 className='page-title'>Users</h3>
        <Button variant='success' onClick={openCreateModal}>
          <i className='fa-solid fa-plus'></i> Create User
        </Button>
      </div>

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
                    src={user.profile?.photo || PLACEHOLDER_AVATAR}
                    className='user-avatar'
                    alt='avatar'
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
                    size='sm'
                    variant='primary'
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </Button>{' '}
                  <Button
                    size='sm'
                    variant='danger'
                    onClick={() => openDeleteModal(user)}
                  >
                    Delete
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
          {Array.from({ length: totalPages }).map((_, i) => (
            <Pagination.Item
              key={i + 1}
              active={i + 1 === currentPage}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          />
        </Pagination>
      )}

      {/* Edit Modal */}
      <UserFormModal
        show={showEditModal}
        showPassword={false}
        title='Edit User'
        submitText='Save'
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSave}
        isSubmitDisabled={!isEditFormValid}
        username={editUsername}
        setUsername={setEditUsername}
        gender={editGender}
        setGender={setEditGender}
        roles={editRoles}
        toggleRole={toggleRole}
        photo={editPhoto}
        setPhoto={setEditPhoto}
        address={editAddress}
        setAddress={setEditAddress}
      />

      {/* Create Modal */}
      <UserFormModal
        show={showCreateModal}
        title='Create User'
        submitText='Create'
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSave}
        isSubmitDisabled={!isEditFormValid}
        username={editUsername}
        setUsername={setEditUsername}
        password={editPassword}
        setPassword={setEditPassword}
        showPassword={true}
        gender={editGender}
        setGender={setEditGender}
        roles={editRoles}
        toggleRole={toggleRole}
        photo={editPhoto}
        setPhoto={setEditPhoto}
        address={editAddress}
        setAddress={setEditAddress}
      />

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
