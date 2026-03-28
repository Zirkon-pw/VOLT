export interface GraphNode {
  id: string;
  name: string;
  path: string;
  linkCount: number;
  wordCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
