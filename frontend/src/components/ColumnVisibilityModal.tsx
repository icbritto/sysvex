import Modal from './Modal';
import { ColumnDef } from '../hooks/useColumnVisibility';

interface ColumnVisibilityModalProps {
  columns: ColumnDef[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  onClose: () => void;
}

export default function ColumnVisibilityModal({ columns, isVisible, onToggle, onClose }: ColumnVisibilityModalProps) {
  return (
    <Modal title="Colunas visíveis" onClose={onClose}>
      <div className="column-list">
        {columns.map((c) => (
          <label key={c.key} className="column-list__item">
            <input type="checkbox" checked={isVisible(c.key)} onChange={() => onToggle(c.key)} />
            {c.label}
          </label>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}
