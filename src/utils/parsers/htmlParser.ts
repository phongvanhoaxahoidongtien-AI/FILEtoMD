import TurndownService from 'turndown';
import { AdminMetadata } from '../../types';
import { extractVietnameseAdminMetadata } from '../vietnameseAdminExtractor';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

export interface HTMLParseResult {
  markdown: string;
  metadata: AdminMetadata;
}

export async function parseHTMLDocument(file: File): Promise<HTMLParseResult> {
  const htmlText = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  // Remove scripts, styles, iframes, ads
  const elementsToRemove = doc.querySelectorAll('script, style, noscript, iframe, svg, nav, footer');
  elementsToRemove.forEach(el => el.remove());

  const cleanBodyHtml = doc.body.innerHTML;
  const markdown = turndownService.turndown(cleanBodyHtml);
  const rawText = doc.body.textContent || '';
  const metadata = extractVietnameseAdminMetadata(rawText);

  return {
    markdown: markdown.trim(),
    metadata
  };
}
