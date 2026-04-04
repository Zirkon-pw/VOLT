package system

import (
	"bytes"
	"context"
	stdhtml "html"
	"io"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	commandbase "volt/commands"

	htmlpkg "golang.org/x/net/html"
)

const ResolveLinkPreviewName = "system.linkPreview.resolve"

const maxPreviewBodyBytes = 1024 * 1024

var (
	whitespaceRegexp    = regexp.MustCompile(`\s+`)
	githubStarsPatterns = []*regexp.Regexp{
		regexp.MustCompile(`"stargazerCount"\s*:\s*([0-9]+)`),
		regexp.MustCompile(`aria-label="([0-9.,kKmM]+)\s+users?\s+starred\s+this\s+repository"`),
		regexp.MustCompile(`href="[^"]+/stargazers"[^>]*>\s*<[^>]+>\s*([0-9.,kKmM]+)\s*</`),
	}
	githubLanguagePatterns = []*regexp.Regexp{
		regexp.MustCompile(`itemprop="programmingLanguage">\s*([^<]+)\s*<`),
		regexp.MustCompile(`"programmingLanguage"\s*:\s*"([^"]+)"`),
	}
	directVideoExtensionLookup = map[string]string{
		".avi":  "video/x-msvideo",
		".m4v":  "video/mp4",
		".mkv":  "video/x-matroska",
		".mov":  "video/quicktime",
		".mp4":  "video/mp4",
		".ogv":  "video/ogg",
		".webm": "video/webm",
	}
)

type ResolveLinkPreviewRequest struct {
	URL string
}

type ResolveLinkPreviewResponse struct {
	Kind        string
	URL         string
	Title       string
	Description string
	SiteName    string
	ImageURL    string
	Owner       string
	Repo        string
	Stars       int
	Language    string
	SourceURL   string
	EmbedURL    string
	MimeType    string
	PosterURL   string
	Provider    string
}

type ResolveLinkPreviewCommand struct {
	client *http.Client

	mu    sync.RWMutex
	cache map[string]ResolveLinkPreviewResponse
}

func NewResolveLinkPreviewCommand() *ResolveLinkPreviewCommand {
	return &ResolveLinkPreviewCommand{
		client: &http.Client{
			Timeout: 8 * time.Second,
		},
		cache: make(map[string]ResolveLinkPreviewResponse),
	}
}

func (c *ResolveLinkPreviewCommand) Name() string {
	return ResolveLinkPreviewName
}

func (c *ResolveLinkPreviewCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[ResolveLinkPreviewRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	normalizedURL, parsedURL, err := normalizeRemoteURL(request.URL)
	if err != nil {
		return nil, err
	}

	if cached, ok := c.getCached(normalizedURL); ok {
		return cached, nil
	}

	response := c.resolve(ctx, parsedURL)
	response.URL = coalesce(response.URL, normalizedURL)
	c.setCached(normalizedURL, response)
	return response, nil
}

func (c *ResolveLinkPreviewCommand) resolve(ctx context.Context, parsedURL *url.URL) ResolveLinkPreviewResponse {
	if owner, repo, ok := parseGitHubRepoURL(parsedURL); ok {
		return c.resolveGitHubPreview(ctx, parsedURL, owner, repo)
	}

	if embedURL, videoID, ok := parseYouTubeEmbedURL(parsedURL); ok {
		return c.resolveYouTubePreview(ctx, parsedURL, embedURL, videoID)
	}

	if response, ok := buildDirectVideoPreview(parsedURL, "direct", ""); ok {
		return response
	}

	if finalURL, contentType, err := c.probeContentType(ctx, parsedURL.String()); err == nil && strings.HasPrefix(contentType, "video/") {
		return buildDirectVideoPreviewResponse(finalURL, finalURL.String(), "direct", contentType)
	}

	finalURL, contentType, body, err := c.fetchPreviewDocument(ctx, parsedURL.String())
	if err != nil {
		return buildFallbackGenericPreview(parsedURL)
	}

	if strings.HasPrefix(contentType, "video/") {
		return buildDirectVideoPreviewResponse(finalURL, finalURL.String(), "direct", contentType)
	}

	if len(body) == 0 {
		return buildFallbackGenericPreview(finalURL)
	}

	preview := extractHTMLPreview(body, finalURL)
	return buildGenericPreview(finalURL, preview)
}

func (c *ResolveLinkPreviewCommand) resolveGitHubPreview(
	ctx context.Context,
	repoURL *url.URL,
	owner, repo string,
) ResolveLinkPreviewResponse {
	response := ResolveLinkPreviewResponse{
		Kind:     "githubRepo",
		URL:      repoURL.String(),
		Title:    owner + "/" + repo,
		Owner:    owner,
		Repo:     repo,
		SiteName: "GitHub",
	}

	finalURL, _, body, err := c.fetchPreviewDocument(ctx, repoURL.String())
	if err != nil {
		return response
	}

	response.URL = finalURL.String()
	preview := extractHTMLPreview(body, finalURL)
	applyPreviewFields(&response, preview)
	response.Stars = parseGitHubStars(body)
	response.Language = parseGitHubLanguage(body)
	return response
}

func (c *ResolveLinkPreviewCommand) resolveYouTubePreview(
	ctx context.Context,
	videoURL *url.URL,
	embedURL, videoID string,
) ResolveLinkPreviewResponse {
	response := ResolveLinkPreviewResponse{
		Kind:      "video",
		URL:       videoURL.String(),
		Title:     "YouTube video",
		SourceURL: videoURL.String(),
		EmbedURL:  embedURL,
		PosterURL: "https://i.ytimg.com/vi/" + videoID + "/hqdefault.jpg",
		Provider:  "youtube",
	}

	finalURL, _, body, err := c.fetchPreviewDocument(ctx, videoURL.String())
	if err != nil {
		return response
	}

	preview := extractHTMLPreview(body, finalURL)
	response.URL = finalURL.String()
	response.SourceURL = finalURL.String()
	response.Title = coalesce(preview.Title, response.Title)
	if preview.ImageURL != "" {
		response.PosterURL = preview.ImageURL
	}
	return response
}

func (c *ResolveLinkPreviewCommand) probeContentType(
	ctx context.Context,
	rawURL string,
) (*url.URL, string, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodHead, rawURL, nil)
	if err != nil {
		return nil, "", err
	}

	request.Header.Set("User-Agent", "Volt/1.0 (+https://volt.local)")
	response, err := c.client.Do(request)
	if err != nil {
		return nil, "", err
	}
	defer response.Body.Close()

	return response.Request.URL, normalizeContentType(response.Header.Get("Content-Type")), nil
}

func (c *ResolveLinkPreviewCommand) fetchPreviewDocument(
	ctx context.Context,
	rawURL string,
) (*url.URL, string, []byte, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", nil, err
	}

	request.Header.Set("User-Agent", "Volt/1.0 (+https://volt.local)")
	request.Header.Set("Accept", "text/html,application/xhtml+xml,video/*;q=0.9,*/*;q=0.8")

	response, err := c.client.Do(request)
	if err != nil {
		return nil, "", nil, err
	}
	defer response.Body.Close()

	finalURL := response.Request.URL
	contentType := normalizeContentType(response.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "video/") {
		return finalURL, contentType, nil, nil
	}

	if contentType != "" && !strings.Contains(contentType, "html") {
		return finalURL, contentType, nil, nil
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, maxPreviewBodyBytes))
	if err != nil {
		return nil, "", nil, err
	}

	return finalURL, contentType, body, nil
}

func (c *ResolveLinkPreviewCommand) getCached(rawURL string) (ResolveLinkPreviewResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	response, ok := c.cache[rawURL]
	return response, ok
}

func (c *ResolveLinkPreviewCommand) setCached(rawURL string, response ResolveLinkPreviewResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache[rawURL] = response
}

type htmlPreview struct {
	Title       string
	Description string
	SiteName    string
	ImageURL    string
}

func extractHTMLPreview(body []byte, baseURL *url.URL) htmlPreview {
	preview := htmlPreview{}
	tokenizer := htmlpkg.NewTokenizer(bytes.NewReader(body))

	for {
		switch tokenizer.Next() {
		case htmlpkg.ErrorToken:
			return preview
		case htmlpkg.StartTagToken, htmlpkg.SelfClosingTagToken:
			tagName, hasAttr := tokenizer.TagName()
			tag := strings.ToLower(string(tagName))

			if tag == "title" {
				if preview.Title != "" {
					continue
				}

				if tokenizer.Next() == htmlpkg.TextToken {
					preview.Title = cleanPreviewText(string(tokenizer.Text()))
				}
				continue
			}

			if tag != "meta" {
				continue
			}

			attributes := make(map[string]string, 4)
			for hasAttr {
				key, value, more := tokenizer.TagAttr()
				attributes[strings.ToLower(string(key))] = cleanPreviewText(stdhtml.UnescapeString(string(value)))
				hasAttr = more
			}
			applyPreviewMeta(&preview, baseURL, attributes)
		}
	}
}

func applyPreviewMeta(preview *htmlPreview, baseURL *url.URL, attrs map[string]string) {
	if preview == nil {
		return
	}

	name := strings.ToLower(attrs["name"])
	property := strings.ToLower(attrs["property"])
	itemprop := strings.ToLower(attrs["itemprop"])
	content := cleanPreviewText(attrs["content"])
	if content == "" {
		return
	}

	switch {
	case property == "og:title":
		preview.Title = content
	case preview.Title == "" && (name == "twitter:title" || itemprop == "name"):
		preview.Title = content
	case property == "og:description":
		preview.Description = content
	case preview.Description == "" && (name == "description" || name == "twitter:description"):
		preview.Description = content
	case property == "og:site_name":
		preview.SiteName = content
	case property == "og:image":
		preview.ImageURL = resolvePreviewURL(baseURL, content)
	case preview.ImageURL == "" && name == "twitter:image":
		preview.ImageURL = resolvePreviewURL(baseURL, content)
	}
}

func applyPreviewFields(response *ResolveLinkPreviewResponse, preview htmlPreview) {
	if response == nil {
		return
	}

	response.Title = coalesce(preview.Title, response.Title)
	response.Description = coalesce(preview.Description, response.Description)
	response.SiteName = coalesce(preview.SiteName, response.SiteName)
	response.ImageURL = coalesce(preview.ImageURL, response.ImageURL)
}

func buildGenericPreview(targetURL *url.URL, preview htmlPreview) ResolveLinkPreviewResponse {
	response := ResolveLinkPreviewResponse{
		Kind: "generic",
		URL:  targetURL.String(),
	}

	applyPreviewFields(&response, preview)
	response.SiteName = coalesce(response.SiteName, prettyHost(targetURL.Host))
	response.Title = coalesce(response.Title, fallbackTitleForURL(targetURL))
	return response
}

func buildFallbackGenericPreview(targetURL *url.URL) ResolveLinkPreviewResponse {
	return ResolveLinkPreviewResponse{
		Kind:     "generic",
		URL:      targetURL.String(),
		Title:    fallbackTitleForURL(targetURL),
		SiteName: prettyHost(targetURL.Host),
	}
}

func buildDirectVideoPreview(targetURL *url.URL, provider, mimeType string) (ResolveLinkPreviewResponse, bool) {
	extension := strings.ToLower(path.Ext(targetURL.Path))
	if extension == "" {
		return ResolveLinkPreviewResponse{}, false
	}

	resolvedMimeType, ok := directVideoExtensionLookup[extension]
	if !ok {
		return ResolveLinkPreviewResponse{}, false
	}

	return buildDirectVideoPreviewResponse(targetURL, targetURL.String(), provider, coalesce(mimeType, resolvedMimeType)), true
}

func buildDirectVideoPreviewResponse(
	targetURL *url.URL,
	sourceURL, provider, mimeType string,
) ResolveLinkPreviewResponse {
	return ResolveLinkPreviewResponse{
		Kind:      "video",
		URL:       targetURL.String(),
		Title:     fallbackTitleForURL(targetURL),
		SourceURL: sourceURL,
		MimeType:  mimeType,
		Provider:  provider,
	}
}

func parseGitHubRepoURL(targetURL *url.URL) (owner, repo string, ok bool) {
	host := strings.ToLower(targetURL.Hostname())
	if host != "github.com" && host != "www.github.com" {
		return "", "", false
	}

	segments := splitURLPath(targetURL.Path)
	if len(segments) < 2 {
		return "", "", false
	}

	owner = segments[0]
	repo = strings.TrimSuffix(segments[1], ".git")
	if owner == "" || repo == "" {
		return "", "", false
	}

	return owner, repo, true
}

func parseYouTubeEmbedURL(targetURL *url.URL) (embedURL, videoID string, ok bool) {
	host := strings.ToLower(targetURL.Hostname())

	switch host {
	case "youtu.be":
		videoID = firstPathSegment(targetURL.Path)
	case "youtube.com", "www.youtube.com", "m.youtube.com":
		segments := splitURLPath(targetURL.Path)
		switch {
		case len(segments) > 0 && segments[0] == "watch":
			videoID = targetURL.Query().Get("v")
		case len(segments) > 1 && (segments[0] == "embed" || segments[0] == "shorts"):
			videoID = segments[1]
		}
	default:
		return "", "", false
	}

	videoID = strings.TrimSpace(videoID)
	if videoID == "" {
		return "", "", false
	}

	return "https://www.youtube.com/embed/" + videoID, videoID, true
}

func parseGitHubStars(body []byte) int {
	htmlText := string(body)
	for _, pattern := range githubStarsPatterns {
		matches := pattern.FindStringSubmatch(htmlText)
		if len(matches) < 2 {
			continue
		}

		if stars, ok := parseCompactCount(matches[1]); ok {
			return stars
		}
	}

	return 0
}

func parseGitHubLanguage(body []byte) string {
	htmlText := string(body)
	for _, pattern := range githubLanguagePatterns {
		matches := pattern.FindStringSubmatch(htmlText)
		if len(matches) < 2 {
			continue
		}

		language := cleanPreviewText(matches[1])
		if language != "" {
			return language
		}
	}

	return ""
}

func parseCompactCount(raw string) (int, bool) {
	normalized := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(raw), ",", ""))
	if normalized == "" {
		return 0, false
	}

	multiplier := 1.0
	switch {
	case strings.HasSuffix(normalized, "k"):
		multiplier = 1_000
		normalized = strings.TrimSuffix(normalized, "k")
	case strings.HasSuffix(normalized, "m"):
		multiplier = 1_000_000
		normalized = strings.TrimSuffix(normalized, "m")
	}

	value, err := strconv.ParseFloat(normalized, 64)
	if err != nil {
		return 0, false
	}

	return int(value * multiplier), true
}

func normalizeRemoteURL(raw string) (string, *url.URL, error) {
	trimmed := strings.TrimSpace(raw)
	parsedURL, err := url.Parse(trimmed)
	if err != nil {
		return "", nil, err
	}

	scheme := strings.ToLower(parsedURL.Scheme)
	if (scheme != "http" && scheme != "https") || parsedURL.Host == "" {
		return "", nil, ErrInvalidRemoteURL
	}

	return parsedURL.String(), parsedURL, nil
}

func normalizeContentType(raw string) string {
	if raw == "" {
		return ""
	}

	return strings.ToLower(strings.TrimSpace(strings.SplitN(raw, ";", 2)[0]))
}

func resolvePreviewURL(baseURL *url.URL, raw string) string {
	parsedURL, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return ""
	}

	if baseURL == nil {
		return parsedURL.String()
	}

	return baseURL.ResolveReference(parsedURL).String()
}

func splitURLPath(rawPath string) []string {
	parts := strings.Split(rawPath, "/")
	segments := make([]string, 0, len(parts))
	for _, part := range parts {
		if part == "" {
			continue
		}
		segments = append(segments, part)
	}
	return segments
}

func firstPathSegment(rawPath string) string {
	segments := splitURLPath(rawPath)
	if len(segments) == 0 {
		return ""
	}

	return segments[0]
}

func fallbackTitleForURL(targetURL *url.URL) string {
	segment := strings.TrimSpace(path.Base(strings.TrimSuffix(targetURL.Path, "/")))
	if segment != "" && segment != "." && segment != "/" {
		return segment
	}

	return prettyHost(targetURL.Host)
}

func prettyHost(rawHost string) string {
	host := strings.TrimSpace(rawHost)
	host = strings.TrimPrefix(host, "www.")
	return host
}

func cleanPreviewText(raw string) string {
	return strings.TrimSpace(whitespaceRegexp.ReplaceAllString(raw, " "))
}

func coalesce(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}

	return ""
}
