package graph

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"

	domain "volt/core/graph"
)

var wikiLinkRe = regexp.MustCompile(`\[\[([^\]]+)\]\]`)
var mdLinkRe = regexp.MustCompile(`\[([^\]]*)\]\(([^)]+\.md)\)`)

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
			return nil
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

	// Read file contents and count words
	fileContents := make(map[string]string, len(allPaths))
	wordCounts := make(map[string]int, len(allPaths))

	for _, relPath := range allPaths {
		fullPath := filepath.Join(voltPath, relPath)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}
		text := string(content)
		fileContents[relPath] = text
		wordCounts[relPath] = len(strings.Fields(text))
	}

	// Build edges
	edgeSet := make(map[string]bool)
	var edges []domain.GraphEdge

	for _, relPath := range allPaths {
		text, ok := fileContents[relPath]
		if !ok {
			continue
		}

		addEdge := func(targetPath string) {
			edgeKey := relPath + "->" + targetPath
			if edgeSet[edgeKey] || relPath == targetPath {
				return
			}
			edgeSet[edgeKey] = true
			edges = append(edges, domain.GraphEdge{
				Source: relPath,
				Target: targetPath,
			})
		}

		// Wiki-links: [[target]], [[target|alias]], [[target#heading]]
		matches := wikiLinkRe.FindAllStringSubmatch(text, -1)
		for _, match := range matches {
			linkTarget := match[1]
			if idx := strings.Index(linkTarget, "|"); idx != -1 {
				linkTarget = linkTarget[:idx]
			}
			if idx := strings.Index(linkTarget, "#"); idx != -1 {
				linkTarget = linkTarget[:idx]
			}
			linkTarget = strings.TrimSpace(linkTarget)
			if linkTarget == "" {
				continue
			}
			if targetPath, ok := mdFiles[strings.ToLower(linkTarget)]; ok {
				addEdge(targetPath)
			}
		}

		// Markdown links: [text](path.md)
		mdMatches := mdLinkRe.FindAllStringSubmatch(text, -1)
		for _, match := range mdMatches {
			linkPath := match[2]
			dir := filepath.Dir(relPath)
			resolved := filepath.Clean(filepath.Join(dir, linkPath))
			for _, nodePath := range allPaths {
				if nodePath == resolved {
					addEdge(resolved)
					break
				}
			}
			baseName := strings.TrimSuffix(filepath.Base(linkPath), filepath.Ext(linkPath))
			if targetPath, ok := mdFiles[strings.ToLower(baseName)]; ok {
				addEdge(targetPath)
			}
		}
	}

	// Count links per node (degree = outgoing + incoming)
	linkCounts := make(map[string]int, len(allPaths))
	for _, edge := range edges {
		linkCounts[edge.Source]++
		linkCounts[edge.Target]++
	}

	// Build nodes with metadata
	nodes := make([]domain.GraphNode, 0, len(allPaths))
	for _, relPath := range allPaths {
		baseName := strings.TrimSuffix(filepath.Base(relPath), filepath.Ext(relPath))
		nodes = append(nodes, domain.GraphNode{
			ID:        relPath,
			Name:      baseName,
			Path:      relPath,
			LinkCount: linkCounts[relPath],
			WordCount: wordCounts[relPath],
		})
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
