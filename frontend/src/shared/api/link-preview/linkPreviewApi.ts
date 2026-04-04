import type { system } from '../../../../wailsjs/go/models';
import { invokeWailsSafe } from '@shared/api/wailsWithError';
import type { LinkPreviewPayload } from './types';

const loadLinkPreviewHandler = () => import('../../../../wailsjs/go/wailshandler/LinkPreviewHandler');

const previewCache = new Map<string, Promise<LinkPreviewPayload>>();

export function resolveLinkPreview(url: string): Promise<LinkPreviewPayload> {
  const normalizedUrl = url.trim();
  const cached = previewCache.get(normalizedUrl);
  if (cached) {
    return cached;
  }

  const request = invokeWailsSafe(
    loadLinkPreviewHandler,
    async (mod) => toLinkPreviewPayload(await mod.ResolveLinkPreview(normalizedUrl)),
    'resolveLinkPreview',
  );

  previewCache.set(normalizedUrl, request);
  request.catch(() => {
    previewCache.delete(normalizedUrl);
  });
  return request;
}

function toLinkPreviewPayload(raw: system.ResolveLinkPreviewResponse): LinkPreviewPayload {
  if (raw.Kind === 'githubRepo') {
    return {
      kind: 'githubRepo',
      url: raw.URL,
      title: raw.Title,
      description: optionalString(raw.Description),
      imageUrl: optionalString(raw.ImageURL),
      owner: raw.Owner,
      repo: raw.Repo,
      stars: optionalNumber(raw.Stars),
      language: optionalString(raw.Language),
    };
  }

  if (raw.Kind === 'video') {
    return {
      kind: 'video',
      url: raw.URL,
      title: optionalString(raw.Title),
      sourceUrl: optionalString(raw.SourceURL),
      embedUrl: optionalString(raw.EmbedURL),
      mimeType: optionalString(raw.MimeType),
      posterUrl: optionalString(raw.PosterURL),
      provider: raw.Provider || 'direct',
    };
  }

  return {
    kind: 'generic',
    url: raw.URL,
    title: raw.Title,
    description: optionalString(raw.Description),
    siteName: optionalString(raw.SiteName),
    imageUrl: optionalString(raw.ImageURL),
  };
}

function optionalString(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: number | undefined | null): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}
