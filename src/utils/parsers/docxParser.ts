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

    // 4. Enhance with Line 3 header extraction directly from HTML table if present
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const firstTable = doc.querySelector('table');
      if (firstTable) {
        const rows = firstTable.querySelectorAll('tr');
        let mottoRowIdx = -1;
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          const text = rows[r].textContent || '';
          if (/Đ[OỘ]C\s*L[AẬ]P\s*[-–—]\s*T[UỰ]\s*DO\s*[-–—]\s*H[AẠ]NH\s*PH[UÚ]C/i.test(text)) {
            mottoRowIdx = r;
            break;
          }
        }

        const line3RowIdx = mottoRowIdx >= 0 ? mottoRowIdx + 1 : (rows.length >= 3 ? 2 : -1);
        if (line3RowIdx >= 0 && line3RowIdx < rows.length) {
          const cells = rows[line3RowIdx].querySelectorAll('td, th');
          if (cells.length >= 2) {
            const leftCellText = cells[0].textContent?.trim() || '';
            const rightCellText = cells[1].textContent?.trim() || '';

            // Left cell of line 3: Document Number (Số: .../...)
            const docNumMatch = leftCellText.match(/(?:Số|So|SỐ|SO|No\.?)\s*[:;.\s\-]*\s*([0-9\s]{0,6}\/[A-Za-zĐđ0-9_.\-&]+(?:\s*[-–—/]\s*[A-Za-zĐđ0-9_.\-&]+)*)/i);
            if (docNumMatch && docNumMatch[1]) {
              metadata.documentNumber = docNumMatch[1].trim();
              metadata.confidenceScore = Math.min(100, (metadata.confidenceScore || 0) + 40);
            }

            // Right cell of line 3: Location and Issue Date
            const locMatch = rightCellText.match(/([A-ZĐÀ-ỹ][\w\s.,'-]{1,40}?),\s*(?:ngày|ngay|\d)/i);
            if (locMatch && locMatch[1]) {
              metadata.location = locMatch[1].replace(/^[^\w\s]+/, '').replace(/[.,;:\s]+$/, '').trim();
            }

            const dateMatch = rightCellText.match(/(?:ngày|ngay)\s*([0-3]?[0-9])\s*(?:tháng|thang|\/|-|\.)\s*([0-1]?[0-9])\s*(?:năm|nam|\/|-|\.)\s*([12][0-9]{3})/i);
            if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
              const d = dateMatch[1].padStart(2, '0');
              const m = dateMatch[2].padStart(2, '0');
              const y = dateMatch[3];
              metadata.issueDate = `${d}/${m}/${y}`;
              metadata.confidenceScore = Math.min(100, (metadata.confidenceScore || 0) + 30);
            }
          }
        }
      }
    } catch {
      // ignore DOM parser issues
    }

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
