import { useState } from 'react';
import { usePluginRegistryStore } from '@kernel/plugin-system/model/pluginRegistry';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@shared/ui/icon';
import { Modal } from '@shared/ui/modal';
import styles from './WorkspaceToolbar.module.scss';

interface WorkspaceToolbarProps {
  mobile?: boolean;
  mobileMode?: 'default' | 'overflow-only';
}

const overflowIcon = {
  svg: `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  `,
} as const;

export function WorkspaceToolbar({
  mobile = false,
  mobileMode = 'default',
}: WorkspaceToolbarProps) {
  const { t } = useI18n();
  const toolbarButtons = usePluginRegistryStore((state) => state.toolbarButtons);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  if (toolbarButtons.length === 0) {
    return null;
  }

  const shouldUseOverflow = mobile && (mobileMode === 'overflow-only' || toolbarButtons.length > 1);

  if (shouldUseOverflow) {
    return (
      <>
        <div className={`${styles.toolbar} ${styles.toolbarMobile}`}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonMobile} ${styles.overflowTrigger}`}
            onClick={() => setMobileActionsOpen(true)}
            aria-label={t('workspace.mobile.actions')}
            title={t('workspace.mobile.actions')}
          >
            <Icon name={overflowIcon} size={18} />
          </button>
        </div>
        <Modal
          isOpen={mobileActionsOpen}
          onClose={() => setMobileActionsOpen(false)}
          title={t('workspace.mobile.actions')}
        >
          <div className={styles.mobileSheetList}>
            {toolbarButtons.map((button) => (
              <button
                key={button.id}
                type="button"
                className={styles.mobileSheetAction}
                onClick={() => {
                  setMobileActionsOpen(false);
                  button.callback();
                }}
              >
                <span className={styles.mobileSheetActionIcon}>
                  <Icon name={button.icon} size={18} />
                </span>
                <span className={styles.mobileSheetActionLabel}>{button.label}</span>
              </button>
            ))}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className={`${styles.toolbar} ${mobile ? styles.toolbarMobile : ''}`}>
      {toolbarButtons.map((button) => (
        <button
          key={button.id}
          type="button"
          className={`${styles.button} ${mobile ? styles.buttonMobile : ''}`}
          onClick={button.callback}
          title={button.label}
          aria-label={button.label}
        >
          <Icon name={button.icon} size={mobile ? 18 : 16} />
        </button>
      ))}
    </div>
  );
}
