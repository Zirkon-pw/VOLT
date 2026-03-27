package search

type SearchResult struct {
	FilePath string `json:"filePath"`
	FileName string `json:"fileName"`
	Snippet  string `json:"snippet"`
	Line     int    `json:"line"`
	IsName   bool   `json:"isName"` // true if matched by file name
}
