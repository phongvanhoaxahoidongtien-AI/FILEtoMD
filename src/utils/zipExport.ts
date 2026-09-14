import JSZip from 'jszip';
import { DocumentItem } from '../types';

/**
 * Downloads a single text/markdown file
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const cleanName = filename.replace(/\.[^/.]+$/, '') + '.md';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports all completed documents into a ZIP package
 */
export async function downloadAllAsZip(documents: DocumentItem[], zipName = 'tailieu_markdown.zip'): Promise<void> {
  const completedDocs = documents.filter(d => d.status === 'completed' && d.markdownOutput);
  if (completedDocs.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const doc of completedDocs) {
    let baseName = doc.name.replace(/\.[^/.]+$/, '') + '.md';
    let counter = 1;
    while (usedNames.has(baseName)) {
      baseName = `${doc.name.replace(/\.[^/.]+$/, '')}_(${counter}).md`;
      counter++;
    }
    usedNames.add(baseName);
    zip.file(baseName, doc.markdownOutput);
  }

  // Also add a README in the zip explaining the batch contents
  const summaryContent = [
    '# DANH SÁCH TÀI LIỆU CHUYỂN ĐỔI SANG MARKDOWN',
    `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`,
    `Tổng số tài liệu: ${completedDocs.length}`,
    'Phương thức xử lý: 100% Client-side Offline (Doc2Markdown)',
    '',
    '## Danh sách chi tiết:',
    ...completedDocs.map((d, i) => {
      const num = d.metadata.documentNumber ? ` | Số: ${d.metadata.documentNumber}` : '';
      const date = d.metadata.issueDate ? ` | Ngày: ${d.metadata.issueDate}` : '';
      return `${i + 1}. **${d.name}**${num}${date}`;
    })
  ].join('\n');

  zip.file('README.md', summaryContent);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Merges all completed documents into one single comprehensive Markdown document
 */
export function mergeAllToSingleMarkdown(documents: DocumentItem[]): string {
  const completedDocs = documents.filter(d => d.status === 'completed' && d.markdownOutput);
  if (completedDocs.length === 0) return '';

  const header = [
    '# TẬP HỢP TÀI LIỆU VĂN BẢN (TỔNG HỢP)',
    `> **Tổng số tài liệu:** ${completedDocs.length}`,
    `> **Thời gian tạo:** ${new Date().toLocaleString('vi-VN')}`,
    `> **Bảo mật:** Xử lý hoàn toàn trong bộ nhớ máy khách (Offline First)`,
    '',
    '## MỤC LỤC TÀI LIỆU',
    ...completedDocs.map((d, i) => {
      const title = d.metadata.titleSubject || d.name;
      const num = d.metadata.documentNumber ? ` [Số: ${d.metadata.documentNumber}]` : '';
      return `${i + 1}. [${title}${num}](#tai-lieu-${i + 1})`;
    }),
    '',
    '---',
    ''
  ].join('\n');

  const bodies = completedDocs.map((d, i) => {
    return `<a id="tai-lieu-${i + 1}"></a>\n\n# [Tài liệu ${i + 1}] ${d.name}\n\n${d.markdownOutput}`;
  });

  return header + '\n\n' + bodies.join('\n\n' + '='.repeat(60) + '\n\n');
}
