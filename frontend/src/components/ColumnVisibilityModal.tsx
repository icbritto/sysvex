import Modal from './Modal';
import { ColumnDef } from '../hooks/useColumnVisibility';
import { ArrowDownIcon, ArrowUpIcon } from '../icons';

interface ColumnVisibilityModalProps {
  orderedColumns: ColumnDef[];
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  onClose: () => void;
}

export default function ColumnVisibilityModal({
  orderedColumns,
  isVisible,
  onToggle,
  onMoveUp,
  onMoveDown,
  onClose,
}: ColumnVisibilityModalProps) {
  return (
    <Modal title="Colunas visíveis" onClose={onClose}>
      <div className="column-list">
        {orderedColumns.map((c, idx) => (
          <div key={c.key} className="column-list__item">
            <label>
              <input type="checkbox" checked={isVisible(c.key)} onChange={() => onToggle(c.key)} />
              {c.label}
            </label>
            <div className="column-list__move-group">
              <button
                type="button"
                className="column-list__move"
                onClick={() => onMoveUp(c.key)}
                disabled={idx === 0}
                title="Mover para cima"
                aria-label={`Mover ${c.label} para cima`}
              >
                <ArrowUpIcon size={14} />
              </button>
              <button
                type="button"
                className="column-list__move"
                onClick={() => onMoveDown(c.key)}
                disabled={idx === orderedColumns.length - 1}
                title="Mover para baixo"
                aria-label={`Mover ${c.label} para baixo`}
              >
                <ArrowDownIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="form-actions">
        <button className="btn btn--sm" onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}
