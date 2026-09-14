import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { AdminMetadata } from '../../types';
import { extractVietnameseAdminMetadata } from '../vietnameseAdminExtractor';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});

// Support tables in turndown
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (content) {
    return '\n\n' + content.trim() + '\n\n';
  }
});

turndownService.addRule('tr', {
  filter: 'tr',
  replacement: function (content, node) {
    let output = '| ' + content.trim().replace(/\n+/g, ' ') + ' |\n';
    // If it's header row, add markdown separator
    const parent = node.parentNode;
    if (parent && (parent.nodeName === 'THEAD' || node === parent.firstChild)) {
      const cells = node.childNodes;
      const count = Array.from(cells).filter(c => c.nodeName === 'TH' || c.nodeName === 'TD').length;
      if (count > 0) {
        output += '|' + ' --- |'.repeat(count) + '\n';
      }
    }
    return output;
  }
});

turndownService.addRule('tdOrTh', {
  filter: ['th', 'td'],
  replacement: function (content) {
    return content.trim().replace(/\|/g, '\\|') + ' | ';
  }
});

export interface DocxParseResult {
  markdown: string;
  metadata: AdminMetadata;
  rawText: string;
}

export async function parseDocxDocument(file: File): Promise<DocxParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    // 1. Convert DOCX to structured HTML using mammoth
    const { value: htmlContent } = await mammoth.convertToHtml({ arrayBuffer });
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });

    // 2. Convert HTML to Markdown
    let markdown = turndownService.turndown(htmlContent);

    // 3. Extract administrative metadata
    const metadata = extractVietnameseAdminMetadata(rawText || markdown);

    return {
      markdown: markdown.trim(),
      metadata,
      rawText
    };
  } catch (err: any) {
    // If it's an older binary .doc format, mammoth might fail
    if (file.name.toLowerCase().endsWith('.doc')) {
      throw new Error(
        'Định dạng .DOC cũ (Word 97-2003 nhị phân) không thể giải mã trực tiếp trong trình duyệt. Vui lòng mở file và lưu lại dưới dạng .DOCX hoặc PDF để chuyển đổi tốt nhất.'
      );
    }
    throw new Error(`Lỗi đọc file Word: ${err?.message || 'Không thể đọc nội dung file'}`);
  }
}
