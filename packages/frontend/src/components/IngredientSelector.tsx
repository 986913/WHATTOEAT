import { useMemo } from 'react';
import { Button, Form } from 'react-bootstrap';
import '../styles/ingredient-selector.css';

export default function IngredientSelector({
  options,
  selectedIds,
  setSelectedIds,

  search,
  setSearch,

  onCreateIngredient,
  creating,
}: {
  options: any[];
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;

  search: string;
  setSearch: (v: string) => void;

  onCreateIngredient: () => void;
  creating: boolean;
}) {
  // filtered options
  const filtered = useMemo(() => {
    return options.filter((ing) =>
      ing.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  // selected ingredient objects
  const selected = options.filter((ing) => selectedIds.includes(ing.id));

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const removeTag = (id: number) => {
    setSelectedIds(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className='ingredient-selector'>
      {/* Tags */}
      <div className='ingredient-tags'>
        {selected.map((ing) => (
          <span key={ing.id} className='ingredient-tag'>
            {ing.name}
            <span className='tag-remove' onClick={() => removeTag(ing.id)}>
              ×
            </span>
          </span>
        ))}
      </div>

      {/* Search Input */}
      <Form.Control
        className='mt-2'
        placeholder='Search or create ingredient...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Dropdown List */}
      <div className='ingredient-dropdown'>
        {search.trim() !== '' && filtered.length === 0 ? (
          <Button
            size='sm'
            variant='outline-success'
            disabled={creating}
            onClick={onCreateIngredient}
          >
            + Create "{search}"
          </Button>
        ) : (
          filtered.map((ing) => (
            <div
              key={ing.id}
              className={`ingredient-option ${
                selectedIds.includes(ing.id) ? 'active' : ''
              }`}
              onClick={() => toggleSelect(ing.id)}
            >
              {ing.name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
