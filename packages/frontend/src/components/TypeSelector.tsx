import { Button } from 'react-bootstrap';

export default function TypeSelector({
  allTypes,
  selected,
  setSelected,
}: {
  allTypes: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const toggle = (t: string) => {
    if (selected.includes(t)) {
      setSelected(selected.filter((x) => x !== t));
    } else {
      setSelected([...selected, t]);
    }
  };

  return (
    <div className='type-pill-group'>
      {allTypes.map((t) => (
        <Button
          key={t}
          size='sm'
          className='type-pill-btn'
          variant={selected.includes(t) ? 'primary' : 'outline-secondary'}
          onClick={() => toggle(t)}
        >
          {t}
        </Button>
      ))}
    </div>
  );
}
