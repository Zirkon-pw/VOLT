package search

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"

	domain "volt/core/search"
)

const maxResults = 50

type SearchFilesUseCase struct{}

func NewSearchFilesUseCase() *SearchFilesUseCase {
	return &SearchFilesUseCase{}
}

func (uc *SearchFilesUseCase) Execute(voltPath, query string) ([]domain.SearchResult, error) {
	if query == "" {
		return []domain.SearchResult{}, nil
	}

	absVolt, err := filepath.Abs(voltPath)
	if err != nil {
		return nil, err
	}

	queryLower := strings.ToLower(query)

	var nameMatches []domain.SearchResult
	var contentMatches []domain.SearchResult

	err = filepath.Walk(absVolt, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // skip inaccessible files
		}

		// Skip hidden directories
		if info.IsDir() && strings.HasPrefix(info.Name(), ".") {
			return filepath.SkipDir
		}

		// Only process .md files
		if info.IsDir() || !strings.HasSuffix(strings.ToLower(info.Name()), ".md") {
			return nil
		}

		// Check total results limit
		if len(nameMatches)+len(contentMatches) >= maxResults {
			return filepath.SkipAll
		}

		relPath, err := filepath.Rel(absVolt, path)
		if err != nil {
			return nil
		}

		fileName := info.Name()
		fileNameLower := strings.ToLower(fileName)

		// Check file name match
		if strings.Contains(fileNameLower, queryLower) {
			nameMatches = append(nameMatches, domain.SearchResult{
				FilePath: relPath,
				FileName: fileName,
				Snippet:  "",
				Line:     0,
				IsName:   true,
			})
		}

		// Search file content
		if len(nameMatches)+len(contentMatches) < maxResults {
			results, err := searchFileContent(relPath, fileName, path, queryLower)
			if err == nil && len(results) > 0 {
				remaining := maxResults - len(nameMatches) - len(contentMatches)
				if len(results) > remaining {
					results = results[:remaining]
				}
				contentMatches = append(contentMatches, results...)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Name matches first, then content matches
	results := make([]domain.SearchResult, 0, len(nameMatches)+len(contentMatches))
	results = append(results, nameMatches...)
	results = append(results, contentMatches...)

	if len(results) > maxResults {
		results = results[:maxResults]
	}

	return results, nil
}

func searchFileContent(relPath, fileName, absPath, queryLower string) ([]domain.SearchResult, error) {
	f, err := os.Open(absPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var results []domain.SearchResult
	scanner := bufio.NewScanner(f)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()
		lineLower := strings.ToLower(line)

		idx := strings.Index(lineLower, queryLower)
		if idx < 0 {
			continue
		}

		snippet := extractSnippet(line, idx, len(queryLower))
		results = append(results, domain.SearchResult{
			FilePath: relPath,
			FileName: fileName,
			Snippet:  snippet,
			Line:     lineNum,
			IsName:   false,
		})

		// Limit content matches per file to avoid flooding from a single file
		if len(results) >= 5 {
			break
		}
	}

	return results, scanner.Err()
}

func extractSnippet(line string, matchIdx, matchLen int) string {
	const contextChars = 50

	start := matchIdx - contextChars
	if start < 0 {
		start = 0
	}

	end := matchIdx + matchLen + contextChars
	if end > len(line) {
		end = len(line)
	}

	snippet := line[start:end]

	if start > 0 {
		snippet = "..." + snippet
	}
	if end < len(line) {
		snippet = snippet + "..."
	}

	return snippet
}
