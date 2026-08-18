import Modal from './Modal';
import { SortDirection, SortOption } from '../hooks/useSort';

interface SortModalProps {
  options: SortOption[];
  sortKey: string;
  direction: SortDirection;
  onChange: (key: string, direction: SortDirection) => void;
  onClose: () => void;
}

export default function SortModal({ options, sortKey, direction, onChange, onClose }: SortModalProps) {
  return (
    <Modal title="Ordenar por" onClose={onClose}>
      <div className="column-list">
        {options.map((o) => (
          <label key={o.key} className="column-list__item">
            <input
              type="radio"
              name="sort-column"
              checked={sortKey === o.key}
              onChange={() => onChange(o.key, direction)}
            />
            {o.label}
          </label>
        ))}
      </div>
      <div className="column-list" style={{ marginTop: -6 }}>
        <label className="column-list__item">
          <input
            type="radio"
            name="sort-direction"
            checked={direction === 'asc'}
            onChange={() => onChange(sortKey, 'asc')}
          />
          Crescente
        </label>
        <label className="column-list__item">
          <input
            type="radio"
            name="sort-direction"
            checked={direction === 'desc'}
            onChange={() => onChange(sortKey, 'desc')}
          />
          Decrescente
        </label>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}
