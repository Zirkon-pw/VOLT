import { preprocessMarkdown } from '@kernel/editor/internal/lib/markdownPreprocessor';

export function parseMarkdown(markdown: string): string {
  return preprocessMarkdown(markdown);
}

export const MarkdownParser = {
  parse: parseMarkdown,
};
