import React, { useEffect, useState } from 'react';
import '../../App.css';
import './index.css';
import axios from '../../utils/axios';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import { Dropdown, Button, Spinner } from 'react-bootstrap';

const DEFAULT_LIMIT = 10;

export default function Meals() {
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const [typeInputVal, setTypeInputVal] = useState<string | undefined>(
    undefined,
  );

  const [meals, setMeals] = useState<
    {
      id: number;
      name: string;
      url: string;
      types: { name: string }[];
      ingredients: { name: string }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  const isFilterDirty = Boolean(typeInputVal);

  // ===== Fetch Meals =====
  const fetchMeals = async (page = 1, type?: string) => {
    setLoading(true);
    const params: any = { page, limit };
    if (type) params.type = type;

    try {
      const res = await axios.get('/meals', { params });
      setMeals(res.data.meals || []);
      setTotalCount(res.data.mealsTotalCount || 0);
      setCurrentPage(res.data.currPage || page);
    } catch (err) {
      console.error('Error fetching meals:', err);
      setMeals([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals(currentPage, typeInputVal);
  }, [currentPage, typeInputVal]);

  const totalPages = Math.ceil(totalCount / limit);

  const clearAllFilters = () => {
    setTypeInputVal(undefined);
    setCurrentPage(1);
    fetchMeals(1);
  };

  return (
    <div className='meals-page container mt-4'>
      <h3 className='page-title'>Meals Table</h3>

      {/* Filters */}
      <div className='filters-bar mb-3 d-flex align-items-center'>
        <Dropdown className='me-2'>
          <Dropdown.Toggle variant='secondary'>
            {typeInputVal
              ? typeInputVal.charAt(0).toUpperCase() + typeInputVal.slice(1)
              : 'Filter by Type'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {mealTypes.map((t) => (
              <Dropdown.Item
                key={t}
                onClick={() => {
                  setTypeInputVal(t);
                  setCurrentPage(1);
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
        <Button
          variant='secondary'
          onClick={clearAllFilters}
          disabled={!isFilterDirty}
        >
          Clear Filter
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className='text-center my-4'>
          <Spinner animation='border' />
        </div>
      ) : (
        <>
          <Table striped bordered hover className='meals-table'>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>URL</th>
                <th>Types</th>
                <th>Ingredients</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {meals.length === 0 ? (
                <tr>
                  <td colSpan={6} className='table-empty'>
                    No Data
                  </td>
                </tr>
              ) : (
                meals.map((meal, index) => (
                  <tr key={meal.id}>
                    <td>{(currentPage - 1) * limit + index + 1}</td>
                    <td>{meal.name}</td>
                    <td>
                      <a href={meal.url} target='_blank' rel='noreferrer'>
                        Link
                      </a>
                    </td>
                    <td>{(meal.types || []).map((t) => t.name).join(', ')}</td>
                    <td>
                      {(meal.ingredients || []).map((i) => i.name).join(', ')}
                    </td>
                    <td>{/* Action 留空 */}</td>
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
        </>
      )}
    </div>
  );
}
