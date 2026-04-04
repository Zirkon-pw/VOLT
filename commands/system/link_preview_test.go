package system

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestResolveLinkPreviewCommandRejectsInvalidRemoteURL(t *testing.T) {
	command := NewResolveLinkPreviewCommand()

	_, err := command.Execute(context.Background(), ResolveLinkPreviewRequest{
		URL: "file:///tmp/note.md",
	})
	if !errors.Is(err, ErrInvalidRemoteURL) {
		t.Fatalf("Execute() error = %v, want %v", err, ErrInvalidRemoteURL)
	}
}

func TestResolveLinkPreviewCommandParsesGenericHTMLPreview(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, `<!doctype html>
			<html>
				<head>
					<title>Ignored fallback title</title>
					<meta property="og:title" content="Generic preview title">
					<meta property="og:description" content="Generic preview description">
					<meta property="og:site_name" content="Example">
					<meta property="og:image" content="/preview.png">
				</head>
			</html>`)
	}))
	defer server.Close()

	command := NewResolveLinkPreviewCommand()
	result, err := command.Execute(context.Background(), ResolveLinkPreviewRequest{
		URL: server.URL + "/article",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	response, ok := result.(ResolveLinkPreviewResponse)
	if !ok {
		t.Fatalf("unexpected response type %T", result)
	}

	if response.Kind != "generic" {
		t.Fatalf("response.Kind = %q, want %q", response.Kind, "generic")
	}
	if response.Title != "Generic preview title" {
		t.Fatalf("response.Title = %q", response.Title)
	}
	if response.Description != "Generic preview description" {
		t.Fatalf("response.Description = %q", response.Description)
	}
	if response.SiteName != "Example" {
		t.Fatalf("response.SiteName = %q", response.SiteName)
	}
	if response.ImageURL != server.URL+"/preview.png" {
		t.Fatalf("response.ImageURL = %q", response.ImageURL)
	}
}

func TestResolveLinkPreviewCommandClassifiesGitHubRepos(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = io.WriteString(w, `<!doctype html>
			<html>
				<head>
					<meta property="og:title" content="example/volt">
					<meta property="og:description" content="Volt preview repository">
					<meta property="og:image" content="https://images.example/github.png">
				</head>
				<body>
					<span itemprop="programmingLanguage">Go</span>
					<a href="/example/volt/stargazers" aria-label="1.2k users starred this repository">Stars</a>
				</body>
			</html>`)
	}))
	defer server.Close()

	targetURL, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("url.Parse() error = %v", err)
	}

	command := NewResolveLinkPreviewCommand()
	command.client.Transport = rewritePreviewHostTransport{
		base:   http.DefaultTransport,
		target: targetURL,
	}

	result, err := command.Execute(context.Background(), ResolveLinkPreviewRequest{
		URL: "https://github.com/example/volt",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	response, ok := result.(ResolveLinkPreviewResponse)
	if !ok {
		t.Fatalf("unexpected response type %T", result)
	}

	if response.Kind != "githubRepo" {
		t.Fatalf("response.Kind = %q, want %q", response.Kind, "githubRepo")
	}
	if response.Owner != "example" || response.Repo != "volt" {
		t.Fatalf("response repo = %s/%s", response.Owner, response.Repo)
	}
	if response.Language != "Go" {
		t.Fatalf("response.Language = %q", response.Language)
	}
	if response.Stars != 1200 {
		t.Fatalf("response.Stars = %d", response.Stars)
	}
}

func TestResolveLinkPreviewCommandBuildsVideoPreviewFromDirectVideoURL(t *testing.T) {
	command := NewResolveLinkPreviewCommand()

	result, err := command.Execute(context.Background(), ResolveLinkPreviewRequest{
		URL: "https://videos.example.com/demo.mp4",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	response, ok := result.(ResolveLinkPreviewResponse)
	if !ok {
		t.Fatalf("unexpected response type %T", result)
	}

	if response.Kind != "video" {
		t.Fatalf("response.Kind = %q, want %q", response.Kind, "video")
	}
	if response.SourceURL != "https://videos.example.com/demo.mp4" {
		t.Fatalf("response.SourceURL = %q", response.SourceURL)
	}
	if response.MimeType != "video/mp4" {
		t.Fatalf("response.MimeType = %q", response.MimeType)
	}
}

func TestResolveLinkPreviewCommandFallsBackToGenericOnNetworkError(t *testing.T) {
	command := NewResolveLinkPreviewCommand()

	result, err := command.Execute(context.Background(), ResolveLinkPreviewRequest{
		URL: "http://127.0.0.1:1/unreachable",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}

	response, ok := result.(ResolveLinkPreviewResponse)
	if !ok {
		t.Fatalf("unexpected response type %T", result)
	}

	if response.Kind != "generic" {
		t.Fatalf("response.Kind = %q, want %q", response.Kind, "generic")
	}
	if response.URL != "http://127.0.0.1:1/unreachable" {
		t.Fatalf("response.URL = %q", response.URL)
	}
}

type rewritePreviewHostTransport struct {
	base   http.RoundTripper
	target *url.URL
}

func (t rewritePreviewHostTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	cloned := req.Clone(req.Context())
	cloned.URL.Scheme = t.target.Scheme
	cloned.URL.Host = t.target.Host
	return t.base.RoundTrip(cloned)
}
