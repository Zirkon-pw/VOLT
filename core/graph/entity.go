package graph

type GraphNode struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	LinkCount int    `json:"linkCount"`
	WordCount int    `json:"wordCount"`
}

type GraphEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
}

type Graph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}
