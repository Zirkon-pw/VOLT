import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import { useTheme } from '@app/providers/ThemeProvider';
import { getGraph } from '@api/graph/graphApi';
import styles from './GraphView.module.scss';

interface GraphViewProps {
  voltPath: string;
  onNodeOpen?: (filePath: string) => void;
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function buildStylesheet(): cytoscape.StylesheetStyle[] {
  const accentColor = getCssVar('--color-accent') || '#7c3aed';
  const textColor = getCssVar('--color-text-primary') || '#1e1e1e';
  const borderColor = getCssVar('--color-border') || '#d1d5db';
  const highlightColor = getCssVar('--color-accent-hover') || accentColor;

  return [
    {
      selector: 'node',
      style: {
        'background-color': accentColor,
        'label': 'data(label)',
        'font-size': '11px',
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'width': 24,
        'height': 24,
        'color': textColor,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': borderColor,
        'curve-style': 'bezier',
        'target-arrow-shape': 'none',
        'opacity': 0.5,
      },
    },
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0,
      },
    },
    {
      selector: 'node.highlighted',
      style: {
        'background-color': highlightColor,
        'width': 32,
        'height': 32,
      },
    },
  ];
}

export function GraphView({ voltPath, onNodeOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { theme } = useTheme();

  const initCytoscape = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const data = await getGraph(voltPath);

      const elements: cytoscape.ElementDefinition[] = [
        ...data.nodes.map((node) => ({
          data: { id: node.id, label: node.name, path: node.path },
        })),
        ...data.edges.map((edge) => ({
          data: { source: edge.source, target: edge.target },
        })),
      ];

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: buildStylesheet(),
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 500,
          nodeRepulsion: () => 8000,
          idealEdgeLength: () => 100,
          gravity: 0.25,
        } as cytoscape.LayoutOptions,
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.3,
      });

      cy.on('tap', 'node', (evt) => {
        const nodeData = evt.target.data();
        if (onNodeOpen && nodeData.path) {
          onNodeOpen(nodeData.path);
        }
      });

      cy.on('mouseover', 'node', (evt) => {
        evt.target.addClass('highlighted');
        containerRef.current!.style.cursor = 'pointer';
      });

      cy.on('mouseout', 'node', (evt) => {
        evt.target.removeClass('highlighted');
        containerRef.current!.style.cursor = 'default';
      });

      cyRef.current = cy;
    } catch (err) {
      console.error('Failed to load graph:', err);
    }
  }, [voltPath, onNodeOpen]);

  useEffect(() => {
    initCytoscape();

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initCytoscape]);

  // Re-apply styles on theme change
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.style(buildStylesheet());
    }
  }, [theme]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Graph View</span>
      </div>
      <div className={styles.canvas} ref={containerRef} />
    </div>
  );
}
