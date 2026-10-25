/**
 * Scan OCR Enhancer for Vietnamese Administrative Documents
 * Tối ưu hóa xử lý văn bản dạng Scan (PDF scan & Ảnh scan)
 * 1. Tiền xử lý hình ảnh Canvas (Khử dấu mộc đỏ, tẩy trắng nền ố vàng, làm đậm nét chữ tiếng Việt)
 * 2. Cấu trúc hóa văn bản OCR thô thành Markdown chuẩn Nghị định 30 (Tiêu đề, căn cứ, điều khoản, bảng biểu, chữ ký)
 */

/**
 * Tiền xử lý canvas toàn trang scan trước khi đưa vào Tesseract OCR:
 * - Khử màu đỏ/hồng của con dấu mộc đè lên chữ (red stamp transparency)
 * - Tăng cường tương phản cục bộ thích ứng (Adaptive contrast boost)
 * - Tẩy trắng nền giấy vàng/xám, làm đậm nét mực đen chữ tiếng Việt
 */
export function enhanceFullPageCanvasForScanOCR(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const enhancedCanvas = document.createElement('canvas');
  enhancedCanvas.width = sourceCanvas.width;
  enhancedCanvas.height = sourceCanvas.height;

  const ctx = enhancedCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0);

  try {
    const imgData = ctx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
    const data = imgData.data;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 1. Nhận diện và làm mờ con dấu đỏ/mực đỏ đè lên chữ:
      // Trong văn bản hành chính Việt Nam, con dấu mộc đỏ thường có R cao và vượt trội so với G, B.
      // Nếu pixel thuộc con dấu đỏ, nâng độ sáng để lộ rõ nét chữ màu đen bên dưới.
      const isRedStamp = r > 125 && r > g * 1.35 && r > b * 1.35;
      if (isRedStamp) {
        // Làm sáng màu con dấu đỏ thành nền sáng để OCR không coi con dấu là rác
        data[i] = 245;
        data[i + 1] = 245;
        data[i + 2] = 245;
        continue;
      }

      // 2. Chuyển đổi độ xám chuẩn mắt người
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // 3. Phân ngưỡng thích ứng (Adaptive Binarization / Contrast Stretch)
      if (gray < 165) {
        // Nét chữ màu đen / xám đậm -> làm đậm đen tuyền để giữ nguyên dấu tiếng Việt
        const darkened = Math.max(0, gray - 60);
        data[i] = darkened;
        data[i + 1] = darkened;
        data[i + 2] = darkened;
      } else {
        // Nền giấy scan (vết ố vàng, bóng đèn scan, vân giấy) -> tẩy trắng hoàn toàn
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Trường hợp CORS canvas bảo mật, trả về canvas gốc
    return sourceCanvas;
  }

  return enhancedCanvas;
}

/**
 * Cấu trúc hóa văn bản OCR thô từ bản scan thành Markdown hoàn chỉnh theo chuẩn hành chính:
 * - Ghép nối các dòng bị ngắt dòng lung tung giữa câu
 * - Tự động nhận diện tiêu đề (# QUYẾT ĐỊNH, # BÁO CÁO...)
 * - Tự động nhận diện căn cứ (- Căn cứ Luật...)
 * - Tự động nhận diện các Điều (**Điều 1.** ...)
 * - Tự động nhận diện và tái tạo bảng biểu số liệu scan
 * - Định dạng nơi nhận và chữ ký
 */
export function structureScannedOCRToMarkdown(rawText: string, pageNum = 1): string {
  if (!rawText || !rawText.trim()) return '';

  // 1. Tách dòng và dọn dẹp các ký tự rác scan ở biên dòng
  const rawLines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !/^[-–—_.*~=]{2,}$/.test(line));

  if (rawLines.length === 0) return '';

  const structuredLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      // Xác định số cột lớn nhất
      const maxCols = Math.max(...tableRows.map(r => r.length), 2);
      // Dựng hàng tiêu đề nếu chưa có
      const headerRow = tableRows[0];
      while (headerRow.length < maxCols) headerRow.push('');
      structuredLines.push(`| ${headerRow.join(' | ')} |`);
      structuredLines.push(`|${' :--- |'.repeat(maxCols)}`);

      // Dựng các hàng thân bảng
      for (let i = 1; i < tableRows.length; i++) {
        const row = tableRows[i];
        while (row.length < maxCols) row.push('');
        structuredLines.push(`| ${row.join(' | ')} |`);
      }
      structuredLines.push('');
      tableRows = [];
    }
    inTable = false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i];

    // Loại bỏ các ký tự rác OCR đơn độc ở đầu dòng
    line = line.replace(/^[|~_.,;:'"`\-\s]+/, '').trim();
    if (!line) continue;

    // A. Nhận diện tiêu đề chính (Heading 1):
    // QUYẾT ĐỊNH, THÔNG BÁO, KẾ HOẠCH, BÁO CÁO, CHỈ THỊ, NGHỊ QUYẾT, TỜ TRÌNH, HƯỚNG DẪN, KẾT LUẬN...
    if (/^(?:QUYẾT\s*ĐỊNH|THÔNG\s*BÁO|KẾ\s*HOẠCH|BÁO\s*CÁO|CHỈ\s*THỊ|NGHỊ\s*QUYẾT|TỜ\s*TRÌNH|HƯỚNG\s*DẪN|KẾT\s*LUẬN|QUY\s*CHẾ|QUY\s*ĐỊNH|BIÊN\s*BẢN)(?:\s*[:;]|$)/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`# ${line.toUpperCase()}`);
      structuredLines.push('');
      continue;
    }

    // B. Nhận diện trích yếu (Heading 2):
    // V/v..., Về việc...
    if (/^(?:V\/v|Về việc|Ve viec)\s*[:;.\s\-]/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`## ${line}`);
      structuredLines.push('');
      continue;
    }

    // C. Nhận diện tên cơ quan ban hành đứng trước quyết định (Heading 3):
    // ỦY BAN NHÂN DÂN..., BAN THƯỜNG VỤ...
    if (/^(?:ỦY BAN NHÂN DÂN|UY BAN NHAN DAN|BAN THƯỜNG VỤ|BAN CHẤP HÀNH|HỘI ĐỒNG NHÂN DÂN)\s+[A-ZĐÀ-ỹ\s]+$/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`### ${line.toUpperCase()}`);
      structuredLines.push('');
      continue;
    }

    // D. Nhận diện mục quyết định hành chính:
    // QUYẾT ĐỊNH:
    if (/^QUYẾT\s*ĐỊNH\s*[:;]/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`### QUYẾT ĐỊNH:`);
      structuredLines.push('');
      continue;
    }

    // E. Nhận diện căn cứ pháp lý:
    // Căn cứ..., Xét đề nghị...
    if (/^(?:Căn cứ|Can cu|Xét đề nghị|Theo đề nghị)\s+/i.test(line)) {
      flushTable();
      structuredLines.push(`- ${line}`);
      continue;
    }

    // F. Nhận diện các Điều khoản:
    // Điều 1., Điều 2., Khoản 1., Điểm a)
    if (/^Điều\s+[0-9IVXLCDM]+[.:\s]/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`**${line}**`);
      continue;
    }
    if (/^(?:Khoản\s+[0-9]+|Điểm\s+[a-zđ])[.:\s]/i.test(line)) {
      flushTable();
      structuredLines.push(`**${line}**`);
      continue;
    }

    // G. Nhận diện và tái tạo bảng biểu scan:
    // Dòng có chứa dấu gạch đứng | hoặc cấu trúc cột (STT, Nội dung, Số lượng, Kinh phí...)
    // Hoặc dòng bắt đầu bằng số thứ tự bảng (1., 2., 3...) kèm số tiền/nội dung
    const isPipeRow = line.includes('|');
    const isNumberedTableRow = /^[0-9]{1,3}\s*[\t\s]{2,}[A-ZĐÀ-ỹ0-9]/i.test(line) && !line.includes('Điều');
    const isTableHeaderRow = /^(?:STT|Số TT|TT)\s+[\w\s]+/i.test(line);

    if (isPipeRow || isNumberedTableRow || isTableHeaderRow) {
      inTable = true;
      let cells: string[] = [];
      if (isPipeRow) {
        cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      } else {
        // Tách các cột theo 2 hoặc nhiều dấu cách/tab
        cells = line.split(/[\t\s]{2,}/).map(c => c.trim()).filter(c => c.length > 0);
      }
      if (cells.length >= 2) {
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      flushTable();
    }

    // H. Nhận diện Nơi nhận:
    if (/^Nơi\s*nhận\s*[:;]/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push('**Nơi nhận:**');
      continue;
    }
    if (structuredLines.some(l => l.includes('**Nơi nhận:**')) && /^[-\s*•]\s*[A-ZĐÀ-ỹ0-9]/i.test(line)) {
      structuredLines.push(`- ${line.replace(/^[-*•\s]+/, '')}`);
      continue;
    }

    // I. Nhận diện chữ ký thẩm quyền:
    // TM. ỦY BAN NHÂN DÂN, CHỦ TỊCH, KT. CHỦ TỊCH, PHÓ CHỦ TỊCH
    if (/^(?:TM\.?|T\/M|KT\.?|K\/T|Q\.?)\s+[A-ZĐÀ-ỹ\s]+/i.test(line) ||
        /^(?:CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH|GIÁM\s*ĐỐC|PHÓ\s*GIÁM\s*ĐỐC|CHÁNH\s*VĂN\s*PHÒNG|BÍ\s*THƯ|PHÓ\s*BÍ\s*THƯ)$/i.test(line)) {
      flushTable();
      structuredLines.push('');
      structuredLines.push(`**${line}**`);
      continue;
    }

    // J. Dòng văn bản thông thường (Nối dòng ngắt dở nếu cùng câu):
    if (
      structuredLines.length > 0 &&
      !structuredLines[structuredLines.length - 1].startsWith('#') &&
      !structuredLines[structuredLines.length - 1].startsWith('|') &&
      !structuredLines[structuredLines.length - 1].startsWith('**') &&
      !structuredLines[structuredLines.length - 1].endsWith('.') &&
      !structuredLines[structuredLines.length - 1].endsWith(':') &&
      !structuredLines[structuredLines.length - 1].endsWith(';') &&
      structuredLines[structuredLines.length - 1] !== ''
    ) {
      // Nối tiếp vào dòng trước nếu dòng trước chưa kết thúc câu
      structuredLines[structuredLines.length - 1] += ' ' + line;
    } else {
      structuredLines.push(line);
    }
  }

  flushTable();

  return structuredLines.join('\n\n').trim();
}
