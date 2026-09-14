import { AdminMetadata, ConversionOptions } from '../types';

/**
 * Post-processes extracted text/markdown into clean, AI-optimized Markdown
 */
export function formatDocumentToMarkdown(
  rawContent: string,
  fileName: string,
  fileType: string,
  metadata: AdminMetadata,
  options: ConversionOptions,
  totalPages?: number
): string {
  const sections: string[] = [];

  // 1. YAML Frontmatter for AI Agents & LLMs
  if (options.addAIPromptHeader) {
    const frontmatterLines: string[] = [
      '---',
      `title: ${JSON.stringify(metadata.titleSubject || fileName.replace(/\.[^/.]+$/, ''))}`,
      `original_filename: ${JSON.stringify(fileName)}`,
      `file_type: ${JSON.stringify(fileType.toUpperCase())}`,
    ];

    if (metadata.documentNumber) {
      frontmatterLines.push(`document_number: ${JSON.stringify(metadata.documentNumber)}`);
    }
    if (metadata.issueDate) {
      frontmatterLines.push(`issue_date: ${JSON.stringify(metadata.issueDate)}`);
    }
    if (metadata.issuingAgency) {
      frontmatterLines.push(`issuing_agency: ${JSON.stringify(metadata.issuingAgency)}`);
    }
    if (metadata.parentAgency) {
      frontmatterLines.push(`parent_agency: ${JSON.stringify(metadata.parentAgency)}`);
    }
    if (metadata.signer) {
      frontmatterLines.push(`signer: ${JSON.stringify(metadata.signer)}`);
    }
    if (totalPages && totalPages > 0) {
      frontmatterLines.push(`total_pages: ${totalPages}`);
    }

    frontmatterLines.push(`processed_offline: true`);
    frontmatterLines.push(`processed_at: ${JSON.stringify(new Date().toISOString())}`);
    frontmatterLines.push('---');
    sections.push(frontmatterLines.join('\n'));

    // Optional AI Instructions Banner
    sections.push(
      `> **[HƯỚNG DẪN DÀNH CHO AI - ChatGPT / Claude / Gemini]**\n` +
      `> Tài liệu được xử lý 100% Client-side Offline. Sử dụng cấu trúc và thông tin số hiệu, ngày ban hành đã chuẩn hóa bên dưới để tóm tắt, tra cứu hoặc trích dẫn pháp lý chính xác.`
    );
  }

  // 2. Standardized Vietnamese Administrative Header Block (Mandatory requirement)
  const hasAdminInfo = metadata.documentNumber || metadata.issueDate || metadata.issuingAgency || metadata.titleSubject;
  if (hasAdminInfo) {
    const adminBlockLines: string[] = [];
    adminBlockLines.push('### THÔNG TIN VĂN BẢN');

    if (metadata.parentAgency) {
      adminBlockLines.push(`**Cơ quan cấp trên:** ${metadata.parentAgency}`);
    }
    if (metadata.issuingAgency) {
      adminBlockLines.push(`**Cơ quan ban hành:** ${metadata.issuingAgency}`);
    }
    if (metadata.documentNumber) {
      adminBlockLines.push(`**Số văn bản:** ${metadata.documentNumber}`);
    }
    if (metadata.location && metadata.issueDate) {
      adminBlockLines.push(`**Ngày ban hành:** ${metadata.location}, ngày ${metadata.issueDate}`);
    } else if (metadata.issueDate) {
      adminBlockLines.push(`**Ngày ban hành:** ${metadata.issueDate}`);
    }
    if (metadata.titleSubject) {
      adminBlockLines.push(`**Trích yếu:** ${metadata.titleSubject}`);
    }
    if (metadata.signer) {
      adminBlockLines.push(`**Người ký:** ${metadata.signer}`);
    }

    adminBlockLines.push('---');
    sections.push(adminBlockLines.join('\n\n'));
  }

  // 3. Clean and normalize body content
  let cleanedBody = rawContent;

  if (options.cleanOCRNoise) {
    cleanedBody = cleanOCRArtifacts(cleanedBody);
  }

  // Remove repeated running headers and footers across pages if enabled
  if (options.removeHeaderFooterRepeat) {
    cleanedBody = removeRecurringHeadersFooters(cleanedBody);
  }

  // Normalize excessive blank lines
  cleanedBody = cleanedBody
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  sections.push(cleanedBody);

  return sections.join('\n\n');
}

/**
 * Remove common OCR artifacts and clean up text
 */
export function cleanOCRArtifacts(text: string): string {
  return text
    // Remove isolated single garbage characters
    .replace(/^[|~¬_—\-+=]{1,3}\s*$/gm, '')
    // Fix common OCR broken characters in Vietnamese
    .replace(/\b([0-9]+)\s*[\/]\s*([a-zA-ZÀ-ỹ]+)/g, '$1/$2')
    // Remove null bytes and unprintable chars (except normal whitespace)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix multiple spaces inside lines (except markdown table pipes)
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('|')) return line; // keep table line spacing
      return line.replace(/[ \t]{2,}/g, ' ');
    })
    .join('\n');
}

/**
 * Detects and removes repeating header/footer text across multiple pages
 */
export function removeRecurringHeadersFooters(text: string): string {
  const pages = text.split(/(?=<!-- PAGE_\d+ -->|(?:\n--- Page \d+ ---\n))/);
  if (pages.length <= 1) return text;

  // Gather first lines and last lines from each page
  const pageHeaders: string[] = [];
  const pageFooters: string[] = [];

  for (const p of pages) {
    const lines = p.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    if (lines.length > 0) {
      pageHeaders.push(lines[0]);
      pageFooters.push(lines[lines.length - 1]);
    }
  }

  // Find frequent repeating lines (> 50% frequency)
  const headerCounts = countFrequencies(pageHeaders);
  const footerCounts = countFrequencies(pageFooters);

  const repeatedHeaders = Object.keys(headerCounts).filter(k => headerCounts[k] >= Math.max(2, pages.length * 0.5));
  const repeatedFooters = Object.keys(footerCounts).filter(k => footerCounts[k] >= Math.max(2, pages.length * 0.5));

  // Strip those repeating lines
  let result = text;
  for (const h of repeatedHeaders) {
    result = result.split('\n').filter(line => line.trim() !== h).join('\n');
  }
  for (const f of repeatedFooters) {
    result = result.split('\n').filter(line => line.trim() !== f).join('\n');
  }

  return result;
}

function countFrequencies(arr: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of arr) {
    if (item.length > 4) {
      map[item] = (map[item] || 0) + 1;
    }
  }
  return map;
}
