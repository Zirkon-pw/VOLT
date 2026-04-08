package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	appfile "volt/backend/application/file"
	appstorage "volt/backend/application/storage"
	domainfile "volt/backend/domain/file"
)

const (
	sessionCookieName = "volt_web_session"
	vaultNamespace    = "vaults"
)

var errWorkspaceNotFound = errors.New("workspace not found")

type workspaceRecord struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	CreatedAt string `json:"createdAt"`
}

type sessionManager struct {
	mu       sync.RWMutex
	password string
	tokens   map[string]time.Time
}

func newSessionManager(password string) *sessionManager {
	if strings.TrimSpace(password) == "" {
		password = "admin"
	}

	return &sessionManager{
		password: password,
		tokens:   make(map[string]time.Time),
	}
}

func (m *sessionManager) create(password string) (string, bool) {
	if password != m.password {
		return "", false
	}

	token := uuid.NewString()
	m.mu.Lock()
	m.tokens[token] = time.Now().UTC()
	m.mu.Unlock()
	return token, true
}

func (m *sessionManager) valid(token string) bool {
	if token == "" {
		return false
	}

	m.mu.RLock()
	_, ok := m.tokens[token]
	m.mu.RUnlock()
	return ok
}

func (m *sessionManager) revoke(token string) {
	if token == "" {
		return
	}

	m.mu.Lock()
	delete(m.tokens, token)
	m.mu.Unlock()
}

type Server struct {
	fileService    *appfile.Service
	storageService *appstorage.Service
	sessions       *sessionManager
	staticDir      string
	mux            *http.ServeMux
}

func NewServer(
	fileService *appfile.Service,
	storageService *appstorage.Service,
	password string,
	staticDir string,
) *Server {
	server := &Server{
		fileService:    fileService,
		storageService: storageService,
		sessions:       newSessionManager(password),
		staticDir:      staticDir,
		mux:            http.NewServeMux(),
	}

	server.registerRoutes()
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/api/auth/login", s.handleLogin)
	s.mux.HandleFunc("/api/auth/logout", s.handleLogout)
	s.mux.HandleFunc("/api/auth/session", s.handleSession)

	s.mux.Handle("/api/workspaces", s.requireSession(http.HandlerFunc(s.handleWorkspaces)))

	s.mux.Handle("/api/files/read", s.requireSession(http.HandlerFunc(s.handleReadFile)))
	s.mux.Handle("/api/files/tree", s.requireSession(http.HandlerFunc(s.handleListTree)))
	s.mux.Handle("/api/files/create", s.requireSession(http.HandlerFunc(s.handleCreateFile)))
	s.mux.Handle("/api/files/write", s.requireSession(http.HandlerFunc(s.handleWriteFile)))
	s.mux.Handle("/api/files/directory", s.requireSession(http.HandlerFunc(s.handleCreateDirectory)))
	s.mux.Handle("/api/files/delete", s.requireSession(http.HandlerFunc(s.handleDeletePath)))
	s.mux.Handle("/api/files/rename", s.requireSession(http.HandlerFunc(s.handleRenamePath)))
	s.mux.Handle("/api/files/asset", s.requireSession(http.HandlerFunc(s.handleWorkspaceAsset)))

	s.mux.Handle("/api/storage/get", s.requireSession(http.HandlerFunc(s.handleStorageGet)))
	s.mux.Handle("/api/storage/list", s.requireSession(http.HandlerFunc(s.handleStorageList)))
	s.mux.Handle("/api/storage/set", s.requireSession(http.HandlerFunc(s.handleStorageSet)))
	s.mux.Handle("/api/storage/delete", s.requireSession(http.HandlerFunc(s.handleStorageDelete)))
	s.mux.Handle("/api/storage/config-dir", s.requireSession(http.HandlerFunc(s.handleStorageConfigDir)))

	s.mux.HandleFunc("/", s.handleFrontend)
}

func (s *Server) requireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(sessionCookieName)
		if err != nil || !s.sessions.valid(cookie.Value) {
			writeError(w, http.StatusUnauthorized, errors.New("authentication required"))
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}

	var payload struct {
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	token, ok := s.sessions.create(payload.Password)
	if !ok {
		writeError(w, http.StatusUnauthorized, errors.New("invalid credentials"))
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": true,
		"platform":      "web",
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}

	cookie, err := r.Cookie(sessionCookieName)
	if err == nil {
		s.sessions.revoke(cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		SameSite: http.SameSiteLaxMode,
	})

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
		return
	}

	cookie, err := r.Cookie(sessionCookieName)
	authenticated := err == nil && s.sessions.valid(cookie.Value)
	writeJSON(w, http.StatusOK, map[string]any{
		"authenticated": authenticated,
		"platform":      "web",
	})
}

func (s *Server) handleWorkspaces(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		workspaces, err := s.listWorkspaces()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		items := make([]map[string]string, 0, len(workspaces))
		for _, workspace := range workspaces {
			items = append(items, map[string]string{
				"id":        workspace.ID,
				"name":      workspace.Name,
				"createdAt": workspace.CreatedAt,
			})
		}

		writeJSON(w, http.StatusOK, map[string]any{"workspaces": items})
	case http.MethodPost:
		var payload struct {
			Name string `json:"name"`
			Path string `json:"path"`
		}
		if err := decodeJSON(r, &payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		workspace, err := s.createWorkspace(payload.Name, payload.Path)
		if err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"workspace": map[string]string{
				"id":        workspace.ID,
				"name":      workspace.Name,
				"path":      workspace.Path,
				"createdAt": workspace.CreatedAt,
			},
		})
	case http.MethodDelete:
		workspaceID := r.URL.Query().Get("id")
		if workspaceID == "" {
			writeError(w, http.StatusBadRequest, errors.New("workspace id is required"))
			return
		}

		if err := s.storageService.Delete(vaultNamespace, workspaceID); err != nil {
			writeError(w, http.StatusNotFound, err)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	default:
		writeError(w, http.StatusMethodNotAllowed, errors.New("method not allowed"))
	}
}

func (s *Server) handleReadFile(w http.ResponseWriter, r *http.Request) {
	workspaceRoot, relPath, err := s.resolveWorkspaceRequest(r)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	content, err := s.fileService.Read(workspaceRoot, relPath)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"content": content})
}

func (s *Server) handleListTree(w http.ResponseWriter, r *http.Request) {
	workspaceRoot, relPath, err := s.resolveWorkspaceRequest(r)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	entries, err := s.fileService.ListTree(workspaceRoot, relPath)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func (s *Server) handleCreateFile(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WorkspaceID string `json:"workspaceId"`
		Path        string `json:"path"`
		Content     string `json:"content"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	workspaceRoot, err := s.workspaceRootPath(payload.WorkspaceID)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if err := s.fileService.CreateFile(workspaceRoot, payload.Path, payload.Content); err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleWriteFile(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WorkspaceID string `json:"workspaceId"`
		Path        string `json:"path"`
		Content     string `json:"content"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	workspaceRoot, err := s.workspaceRootPath(payload.WorkspaceID)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if err := s.fileService.Write(workspaceRoot, payload.Path, payload.Content); err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleCreateDirectory(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WorkspaceID string `json:"workspaceId"`
		Path        string `json:"path"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	workspaceRoot, err := s.workspaceRootPath(payload.WorkspaceID)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if err := s.fileService.CreateDirectory(workspaceRoot, payload.Path); err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleDeletePath(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WorkspaceID string `json:"workspaceId"`
		Path        string `json:"path"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	workspaceRoot, err := s.workspaceRootPath(payload.WorkspaceID)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if err := s.fileService.Delete(workspaceRoot, payload.Path); err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleRenamePath(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		WorkspaceID string `json:"workspaceId"`
		OldPath     string `json:"oldPath"`
		NewPath     string `json:"newPath"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	workspaceRoot, err := s.workspaceRootPath(payload.WorkspaceID)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if err := s.fileService.Rename(workspaceRoot, payload.OldPath, payload.NewPath); err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleWorkspaceAsset(w http.ResponseWriter, r *http.Request) {
	workspaceRoot, relPath, err := s.resolveWorkspaceRequest(r)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	fullPath, err := safeAssetPath(workspaceRoot, relPath)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		writeError(w, mapFileErrorStatus(err), err)
		return
	}

	if contentType := mime.TypeByExtension(filepath.Ext(fullPath)); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (s *Server) handleStorageGet(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	key := r.URL.Query().Get("key")
	value, err := s.storageService.Get(namespace, key)
	if err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"value": json.RawMessage(value),
	})
}

func (s *Server) handleStorageList(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	entries, err := s.storageService.List(namespace)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	type entry struct {
		Key   string          `json:"key"`
		Value json.RawMessage `json:"value"`
	}

	items := make([]entry, 0, len(entries))
	for _, item := range entries {
		items = append(items, entry{
			Key:   item.Key,
			Value: json.RawMessage(item.Value),
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"entries": items})
}

func (s *Server) handleStorageSet(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Namespace string      `json:"namespace"`
		Key       string      `json:"key"`
		Value     interface{} `json:"value"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	raw, err := json.Marshal(payload.Value)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	if err := s.storageService.Set(payload.Namespace, payload.Key, raw); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleStorageDelete(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Namespace string `json:"namespace"`
		Key       string `json:"key"`
	}
	if err := decodeJSON(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	if err := s.storageService.Delete(payload.Namespace, payload.Key); err != nil {
		writeError(w, http.StatusNotFound, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleStorageConfigDir(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"configDir": ""})
}

func (s *Server) handleFrontend(w http.ResponseWriter, r *http.Request) {
	if s.staticDir != "" {
		indexPath := filepath.Join(s.staticDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.FileServer(http.Dir(s.staticDir)).ServeHTTP(w, r)
			return
		}
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = fmt.Fprintf(w, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Volt Web</title>
  </head>
  <body>
    <main style="font-family: sans-serif; max-width: 720px; margin: 4rem auto; line-height: 1.5;">
      <h1>Volt Web Host</h1>
      <p>The Go web host is running. Build the web shell into <code>packages/web-shell/dist</code> to serve the shared frontend here.</p>
    </main>
  </body>
</html>`)
}

func (s *Server) resolveWorkspaceRequest(r *http.Request) (string, string, error) {
	workspaceID := r.URL.Query().Get("workspaceId")
	if workspaceID == "" {
		return "", "", errors.New("workspaceId is required")
	}

	workspaceRoot, err := s.workspaceRootPath(workspaceID)
	if err != nil {
		return "", "", err
	}

	return workspaceRoot, r.URL.Query().Get("path"), nil
}

func (s *Server) listWorkspaces() ([]workspaceRecord, error) {
	entries, err := s.storageService.List(vaultNamespace)
	if err != nil {
		return nil, err
	}

	workspaces := make([]workspaceRecord, 0, len(entries))
	for _, entry := range entries {
		var workspace workspaceRecord
		if err := json.Unmarshal(entry.Value, &workspace); err != nil {
			continue
		}
		if workspace.ID == "" {
			workspace.ID = entry.Key
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (s *Server) createWorkspace(name string, path string) (workspaceRecord, error) {
	normalizedPath := strings.TrimSpace(strings.TrimRight(path, `/\`))
	if normalizedPath == "" {
		return workspaceRecord{}, errors.New("workspace path is required")
	}

	// Create the directory if it does not exist yet (including any missing parents).
	if err := os.MkdirAll(normalizedPath, 0o755); err != nil {
		return workspaceRecord{}, fmt.Errorf("failed to create workspace directory: %w", err)
	}

	workspaces, err := s.listWorkspaces()
	if err != nil {
		return workspaceRecord{}, err
	}

	for _, workspace := range workspaces {
		if workspace.Path == normalizedPath {
			return workspaceRecord{}, errors.New("a workspace with this path already exists")
		}
	}

	workspaceName := strings.TrimSpace(name)
	if workspaceName == "" {
		workspaceName = filepath.Base(normalizedPath)
	}

	workspace := workspaceRecord{
		ID:        uuid.NewString(),
		Name:      workspaceName,
		Path:      normalizedPath,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}

	raw, err := json.Marshal(workspace)
	if err != nil {
		return workspaceRecord{}, err
	}

	if err := s.storageService.Set(vaultNamespace, workspace.ID, raw); err != nil {
		return workspaceRecord{}, err
	}

	return workspace, nil
}

func (s *Server) workspaceRootPath(workspaceID string) (string, error) {
	if strings.TrimSpace(workspaceID) == "" {
		return "", errors.New("workspaceId is required")
	}

	workspaces, err := s.listWorkspaces()
	if err != nil {
		return "", err
	}

	for _, workspace := range workspaces {
		if workspace.ID == workspaceID {
			return workspace.Path, nil
		}
	}

	return "", errWorkspaceNotFound
}

func decodeJSON(r *http.Request, target any) error {
	defer r.Body.Close()
	if r.Body == nil {
		return errors.New("request body is required")
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{
		"error": err.Error(),
	})
}

func mapFileErrorStatus(err error) int {
	switch {
	case errors.Is(err, errWorkspaceNotFound):
		return http.StatusNotFound
	case errors.Is(err, domainfile.ErrFileNotFound):
		return http.StatusNotFound
	case errors.Is(err, domainfile.ErrAlreadyExists):
		return http.StatusConflict
	case errors.Is(err, domainfile.ErrPermissionDenied):
		return http.StatusForbidden
	case errors.Is(err, domainfile.ErrPathTraversal):
		return http.StatusBadRequest
	default:
		return http.StatusBadRequest
	}
}

func safeAssetPath(rootPath string, relativePath string) (string, error) {
	absRoot, err := filepath.Abs(rootPath)
	if err != nil {
		return "", domainfile.ErrPathTraversal
	}

	fullPath := filepath.Join(absRoot, relativePath)
	fullPath, err = filepath.Abs(fullPath)
	if err != nil {
		return "", domainfile.ErrPathTraversal
	}

	rel, err := filepath.Rel(absRoot, fullPath)
	if err != nil {
		return "", domainfile.ErrPathTraversal
	}

	if strings.HasPrefix(rel, "..") {
		return "", domainfile.ErrPathTraversal
	}

	return fullPath, nil
}
