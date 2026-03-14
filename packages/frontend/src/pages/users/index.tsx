import { useEffect, useState } from 'react';
import '../../styles/pages/users.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import { useToast } from '../../hooks/useToast';
import { Button } from 'react-bootstrap';
import AppToast from '../../components/AppToast';
import ConfirmModal from '../../components/ConfirmModal';
import UserFormModal from '../../components/UserFormModal';
import PageHeader from '../../components/PageHeader';
import AppPagination from '../../components/AppPagination';

const DEFAULT_LIMIT = 10;
const PLACEHOLDER_AVATAR =
  'https://i.pinimg.com/736x/3c/67/75/3c67757cef723535a7484a6c7bfbfc43.jpg';
export type RoleType = '' | '1' | '2' | '3';
export type GenderType = '' | '1' | '2';

export default function Users() {
  const { toast, success, error } = useToast();

  // ================= Filters =================
  const [userNameInputVal, setUserNameInputVal] = useState('');
  const [roleInputVal, setRoleInputVal] = useState<RoleType>('');
  const [genderInputVal, setGenderInputVal] = useState<GenderType>('');

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
  const [editEmail, setEditEmail] = useState('');
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
    filters?: { username?: string; role?: '1' | '2' | '3'; gender?: '1' | '2' },
  ) => {
    const params = { page, limit, ...filters };
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
          role: roleInputVal || undefined,
          gender: genderInputVal || undefined,
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
    await fetchUsers(1);
  };

  // ================= Modal Open Helpers =================
  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email || '');
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
    setEditEmail('');
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
    try {
      await axios.put(`/users/${selectedUser.id}`, {
        username: editUsername,
        email: editEmail,
        profile: {
          address: editAddress,
          gender: editGender,
          photo: editPhoto,
        },
        roles: editRoles,
      });
      setShowEditModal(false);
      success('User updated successfully ✏️');
      fetchUsers(currentPage);
    } catch (err) {
      console.error(err);
      error('Failed to edit user ❌');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await axios.delete(`/users/${selectedUser.id}`);
      setShowDeleteModal(false);
      success('User deleted successfully 🗑️');
      fetchUsers(currentPage);
    } catch (err) {
      console.error(err);
      error('Failed to delete user ❌');
    }
  };

  const handleCreateSave = async () => {
    try {
      await axios.post('/users', {
        username: editUsername,
        email: editEmail,
        password: editPassword,
        profile: {
          gender: editGender,
          photo: editPhoto,
          address: editAddress,
        },
        roles: editRoles,
      });

      setShowCreateModal(false);
      success('User created successfully ✅');
      setCurrentPage(1);
      fetchUsers(1);
    } catch (err) {
      console.error(err);
      error('Failed to create user ❌');
    }
  };

  // ================= Render =================
  return (
    <div className='page'>
      <PageHeader
        title='Users'
        action={
          <Button variant='success' onClick={openCreateModal}>
            <i className='fa-solid fa-plus'></i> Create User
          </Button>
        }
      />

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
            onChange={(e) => setRoleInputVal(e.target.value as RoleType)}
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
                onChange={(e) =>
                  setGenderInputVal(e.target.value as GenderType)
                }
              />
              Female
            </label>
            <label>
              <input
                type='radio'
                name='gender'
                value='2'
                checked={genderInputVal === '2'}
                onChange={(e) =>
                  setGenderInputVal(e.target.value as GenderType)
                }
              />
              Male
            </label>
          </div>

          <button
            className='btn-search'
            onClick={() =>
              fetchUsers(1, {
                username: userNameInputVal || undefined,
                role: roleInputVal || undefined,
                gender: genderInputVal || undefined,
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
            <th>Email</th>
            <th>Auth</th>
            <th>Gender</th>
            <th>Roles</th>
            <th>Address</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={9} className='table-empty'>
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
                <td>{user.email || '-'}</td>
                <td>
                  <span className={`auth-badge ${user.googleId ? 'google' : 'password'}`}>
                    {user.googleId ? 'Google' : 'Password'}
                  </span>
                </td>
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

      <AppPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

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
        email={editEmail}
        setEmail={setEditEmail}
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
        email={editEmail}
        setEmail={setEditEmail}
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
      <ConfirmModal
        show={!!showDeleteModal}
        title='Delete User'
        message='Are you sure you want to delete this user ?'
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />

      <AppToast {...toast} />
    </div>
  );
}
