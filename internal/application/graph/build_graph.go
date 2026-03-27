package graph

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"

	domain "volt/core/graph"
)

var wikiLinkRe = regexp.MustCompile(`\[\[([^\]]+)\]\]`)

type BuildGraphUseCase struct{}

func NewBuildGraphUseCase() *BuildGraphUseCase {
	return &BuildGraphUseCase{}
}

func (uc *BuildGraphUseCase) Execute(voltPath string) (*domain.Graph, error) {
	// Collect all .md files
	mdFiles := make(map[string]string) // lowercase name (without ext) -> relative path
	var allPaths []string

	err := filepath.Walk(voltPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip errors
		}
		if info.IsDir() {
			return nil
		}
		if strings.ToLower(filepath.Ext(path)) != ".md" {
			return nil
		}

		relPath, err := filepath.Rel(voltPath, path)
		if err != nil {
			return nil
		}

		allPaths = append(allPaths, relPath)

		baseName := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		mdFiles[strings.ToLower(baseName)] = relPath

		return nil
	})
	if err != nil {
		return nil, err
	}

	// Build nodes
	nodes := make([]domain.GraphNode, 0, len(allPaths))
	for _, relPath := range allPaths {
		baseName := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		nodes = append(nodes, domain.GraphNode{
			ID:   relPath,
			Name: baseName,
			Path: relPath,
		})
	}

	// Build edges by extracting wiki-links
	edgeSet := make(map[string]bool)
	var edges []domain.GraphEdge

	for _, relPath := range allPaths {
		fullPath := filepath.Join(voltPath, relPath)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}

		matches := wikiLinkRe.FindAllStringSubmatch(string(content), -1)
		for _, match := range matches {
			linkTarget := match[1]
			// Handle links with aliases: [[target|alias]]
			if idx := strings.Index(linkTarget, "|"); idx != -1 {
				linkTarget = linkTarget[:idx]
			}
			// Handle links with headings: [[target#heading]]
			if idx := strings.Index(linkTarget, "#"); idx != -1 {
				linkTarget = linkTarget[:idx]
			}

			linkTarget = strings.TrimSpace(linkTarget)
			if linkTarget == "" {
				continue
			}

			targetPath, ok := mdFiles[strings.ToLower(linkTarget)]
			if !ok {
				continue
			}

			edgeKey := relPath + "->" + targetPath
			if edgeSet[edgeKey] {
				continue
			}
			// Skip self-links
			if relPath == targetPath {
				continue
			}
			edgeSet[edgeKey] = true
			edges = append(edges, domain.GraphEdge{
				Source: relPath,
				Target: targetPath,
			})
		}
	}

	if nodes == nil {
		nodes = []domain.GraphNode{}
	}
	if edges == nil {
		edges = []domain.GraphEdge{}
	}

	return &domain.Graph{
		Nodes: nodes,
		Edges: edges,
	}, nil
}
