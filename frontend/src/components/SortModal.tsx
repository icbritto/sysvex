import Modal from './Modal';
import { ArrowDownIcon, ArrowUpIcon } from '../icons';
import { SortDirection, SortOption } from '../hooks/useSort';

interface SortModalProps {
  options: SortOption[];
  sortKey: string;
  direction: SortDirection;
  onChange: (key: string, direction: SortDirection) => void;
  onClose: () => void;
}

export default function SortModal({ options, sortKey, direction, onChange, onClose }: SortModalProps) {
  const handleClick = (key: string) => {
    const active = key === sortKey;
    onChange(key, active ? (direction === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  return (
    <Modal title="Ordenar por" onClose={onClose}>
      <div className="sort-list">
        {options.map((o) => {
          const active = o.key === sortKey;
          return (
            <button
              key={o.key}
              type="button"
              className={`sort-list__item${active ? ' sort-list__item--active' : ''}`}
              onClick={() => handleClick(o.key)}
            >
              <span>{o.label}</span>
              {active && (direction === 'asc' ? <ArrowUpIcon size={14} /> : <ArrowDownIcon size={14} />)}
            </button>
          );
        })}
      </div>
      <div className="form-actions form-actions--end">
        <button className="btn btn--sm" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}
