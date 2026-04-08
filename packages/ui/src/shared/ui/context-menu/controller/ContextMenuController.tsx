import { ContextMenuProps } from '../model/types';
import { ContextMenuView } from '../view/ContextMenuView';

export function ContextMenu({ items, position, onClose, presentation = 'popover' }: ContextMenuProps) {
  if (items.length === 0) return null;

  return (
    <ContextMenuView
      items={items}
      position={position}
      onClose={onClose}
      presentation={presentation}
    />
  );
}
