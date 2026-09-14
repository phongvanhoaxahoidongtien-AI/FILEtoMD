import { AdminMetadata } from '../../types';
import { extractVietnameseAdminMetadata } from '../vietnameseAdminExtractor';

export interface TXTParseResult {
  markdown: string;
  metadata: AdminMetadata;
}

export async function parseTXTDocument(file: File): Promise<TXTParseResult> {
  const rawText = await file.text();
  const metadata = extractVietnameseAdminMetadata(rawText);

  // Clean trailing spaces and excessive blank lines
  const cleanedMarkdown = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    markdown: cleanedMarkdown,
    metadata
  };
}
