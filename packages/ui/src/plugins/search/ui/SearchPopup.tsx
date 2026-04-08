import { useRef, useState } from 'react';
import { useSearchPopup } from '../hooks/useSearchPopup';
import { useShellLayout } from '@shared/responsive';
import { Icon } from '@shared/ui/icon';
import { FileSearchResults } from './FileSearchResults';
import { CommandPaletteResults } from './CommandPaletteResults';
import styles from './SearchPopup.module.scss';

interface SearchPopupProps {
  isOpen: boolean;
  initialQuery?: string;
  openToken?: number;
  onClose: () => void;
  voltId: string;
  locator: string;
  onToggleSidebar: () => void;
}

export function SearchPopup({
  isOpen,
  initialQuery = '',
  openToken = 0,
  onClose,
  voltId,
  locator,
  onToggleSidebar,
}: SearchPopupProps) {
  const { mode } = useShellLayout();
  const isMobile = mode === 'mobile';
  const {
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    resultsRef,
    isCommandMode,
    commandResults,
    highlightedResults,
    handleKeyDown,
    handleOverlayClick,
    handleSelect,
    handleCommandSelect,
    t,
  } = useSearchPopup(isOpen, initialQuery, openToken, onClose, voltId, locator, onToggleSidebar);

  const dragState = useRef<{ startY: number; offset: number; active: boolean }>({
    startY: 0,
    offset: 0,
    active: false,
  });
  const [dragOffset, setDragOffset] = useState(0);

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.overlay} ${isMobile ? styles.overlayMobile : ''}`}
      data-testid="workspace-search-popup"
      onClick={handleOverlayClick}
    >
      <div
        className={`${styles.popup} ${isMobile ? styles.popupMobile : ''}`}
        onKeyDown={handleKeyDown}
        style={isMobile && dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        {isMobile ? (
          <div
            className={styles.sheetHandleArea}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse') {
                return;
              }

              dragState.current = {
                startY: event.clientY,
                offset: 0,
                active: true,
              };
            }}
            onPointerMove={(event) => {
              if (!dragState.current.active || event.pointerType === 'mouse') {
                return;
              }

              const nextOffset = Math.max(0, event.clientY - dragState.current.startY);
              dragState.current.offset = nextOffset;
              setDragOffset(nextOffset);
            }}
            onPointerUp={() => {
              const shouldClose = dragState.current.offset > 96;
              dragState.current = { startY: 0, offset: 0, active: false };
              setDragOffset(0);
              if (shouldClose) {
                onClose();
              }
            }}
            onPointerCancel={() => {
              dragState.current = { startY: 0, offset: 0, active: false };
              setDragOffset(0);
            }}
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
          </div>
        ) : null}
        <div className={styles.inputWrapper}>
          {isMobile ? (
            <button
              type="button"
              className={styles.mobileClose}
              onClick={onClose}
              aria-label={t('common.close')}
            >
              <Icon name="close" size={18} />
            </button>
          ) : null}
          <input
            ref={inputRef}
            data-testid="workspace-search-input"
            className={styles.input}
            type="text"
            placeholder={t(isCommandMode ? 'search.commandPlaceholder' : 'search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.results} ref={resultsRef}>
          {isCommandMode ? (
            <CommandPaletteResults
              commands={commandResults}
              activeIndex={activeIndex}
              onSelect={handleCommandSelect}
              onHover={setActiveIndex}
              emptyLabel={t('search.commandEmpty')}
            />
          ) : (
            <FileSearchResults
              results={highlightedResults}
              query={query}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onHover={setActiveIndex}
              emptyLabel={t('search.empty')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
