import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoltStore } from '@app/stores/voltStore';
import { useWorkspaceStore } from '@app/stores/workspaceStore';
import { Button } from '@uikit/button';
import { TextInput } from '@uikit/text-input';
import { Modal } from '@uikit/modal';
import { VoltCard } from '@widgets/volt-card/VoltCard';
import { selectDirectory } from '@api/volt/voltApi';
import voltLogo from '@app/assets/volt-logo.svg';
import styles from './HomePage.module.scss';

export function HomePage() {
  const { volts, loading, error, fetchVolts, createVolt, deleteVolt } =
    useVoltStore();
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [voltName, setVoltName] = useState('');
  const [voltPath, setVoltPath] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchVolts();
  }, [fetchVolts]);

  const handleOpenModal = () => {
    setVoltName('');
    setVoltPath('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSelectDirectory = async () => {
    try {
      const dir = await selectDirectory();
      if (dir) {
        setVoltPath(dir);
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleCreate = async () => {
    if (!voltName.trim() || !voltPath.trim()) return;
    setCreating(true);
    const result = await createVolt(voltName.trim(), voltPath.trim());
    setCreating(false);
    if (result) {
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteVolt(id);
  };

  const handleOpenVolt = (volt: { id: string; name: string; path: string }) => {
    openWorkspace({
      voltId: volt.id,
      voltName: volt.name,
      voltPath: volt.path,
    });
    navigate(`/workspace/${volt.id}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <img className={styles.logo} src={voltLogo} alt="volt logo" />
            <div className={styles.brandCopy}>
              <span className={styles.kicker}>Local-first markdown workspace</span>
              <h1 className={styles.title}>volt</h1>
              <p className={styles.subtitle}>
                Notes, graph links and fast search in one compact desktop app.
              </p>
            </div>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenModal}>
            New volt
          </Button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!loading && volts.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyText}>No volts yet</span>
            <span className={styles.emptyHint}>
              Create a new volt to get started
            </span>
            <Button variant="secondary" size="lg" onClick={handleOpenModal}>
              Create your first volt
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {volts.map((volt) => (
              <VoltCard
                key={volt.id}
                volt={volt}
                onDelete={handleDelete}
                onOpen={handleOpenVolt}
              />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title="New volt">
        <TextInput
          label="volt name"
          placeholder="My Notes"
          value={voltName}
          onChange={(e) => setVoltName(e.target.value)}
          autoFocus
        />

        <div className={styles.modalField}>
          <span className={styles.modalLabel}>Location</span>
          <div className={styles.directorySelector}>
            <div
              className={`${styles.directoryPath} ${voltPath ? styles.directoryPathSelected : ''}`}
              title={voltPath}
            >
              {voltPath || 'No directory selected'}
            </div>
            <Button variant="secondary" size="sm" onClick={handleSelectDirectory}>
              Browse
            </Button>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreate}
            disabled={!voltName.trim() || !voltPath.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
