import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';

const DEFAULT_LIMIT = 10;

export default function Meals() {
  // ===== Filters =====
  const [typeInputVal, setTypeInputVal] = useState<string | undefined>(
    undefined,
  );

  // ===== Data =====
  const [meals, setMeals] = useState<any[]>([]);

  // ===== Pagination =====
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  // ===== Derived state =====
  const isFilterDirty = Boolean(typeInputVal);

  // ===== Fetch Meals =====
  const fetchMeals = async (page: number, type?: string) => {
    const params: any = { page, limit };
    if (type !== undefined) params.type = type;

    try {
      const res = await axios.get('/meals', { params });
      const data = res.data.meals || [];
      setMeals(data);
      setTotalCount(data.length);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
      setTotalCount(0);
    }
  };

  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / limit);

  const clearAllFilters = async () => {
    setTypeInputVal(undefined);
    setCurrentPage(1);
    await fetchMeals(1);
  };

  return (
    <div className='meals-page'>
      <h3 className='page-title'>Meals</h3>

      {/* ================= Filters ================= */}
      <div className='filters-bar'>
        <div className='filters-left'>
          <select
            className='filter-select'
            value={typeInputVal ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setTypeInputVal(val === '' ? undefined : val);
              setCurrentPage(1);
            }}
          >
            <option value=''>All Types</option>
            <option value='breakfast'>Breakfast</option>
            <option value='lunch'>Lunch</option>
            <option value='dinner'>Dinner</option>
            <option value='snack'>Snack</option>
          </select>

          <button
            className='btn-search'
            onClick={() => fetchMeals(1, typeInputVal)}
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

      {/* ================= Table ================= */}
      <Table striped bordered hover className='meals-table'>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>URL</th>
            <th>Types</th>
            <th>Creator</th>
            <th>Ingredients</th>
          </tr>
        </thead>
        <tbody>
          {meals.length === 0 ? (
            <tr>
              <td colSpan={5} className='table-empty'>
                No Data
              </td>
            </tr>
          ) : (
            meals.map((meal, index) => (
              <tr key={meal.id}>
                <td>{(currentPage - 1) * limit + index + 1}</td>
                <td>{meal.name}</td>
                <td>
                  {meal.url ? (
                    <a href={meal.url} target='_blank' rel='noreferrer'>
                      Link
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{meal.types?.map((t: any) => t.name).join(', ')}</td>
                <td>{meal.user?.username ? meal.user.username : '-'}</td>
                <td>{meal.ingredients?.map((i: any) => i.name).join(', ')}</td>
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
