import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import React, { useEffect, useState } from 'react';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
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

  // ===== Fetch =====
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

  // ===== Auto fetch on page change =====
  useEffect(() => {
    // 如果 filters dirty，使用当前 filter
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

  // ===== Clear Filters =====
  const clearAllFilters = async () => {
    setUserNameInputVal('');
    setRoleInputVal('');
    setGenderInputVal('');
    setCurrentPage(1);
    // 显式传空 filters，保证 URL 不带任何 filter
    await fetchUsers(1, { username: '', role: '', gender: '' });
  };

  return (
    <div className='users-page'>
      <h3 className='page-title'>Users</h3>

      {/* ================= Filters ================= */}
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

        {/* ===== Clear Button Right Aligned ===== */}
        <button
          className={`btn-clear ${isFilterDirty ? 'active' : 'disabled'}`}
          disabled={!isFilterDirty}
          onClick={clearAllFilters}
        >
          Clear All Filters
        </button>
      </div>

      {/* ================= Table ================= */}
      <Table striped bordered hover className='users-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Photo</th>
            <th>Username</th>
            <th>Gender</th>
            <th>Roles</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className='table-empty'>
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
              </tr>
            ))
          )}
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
    </div>
  );
}
