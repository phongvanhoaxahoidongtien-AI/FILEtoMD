import JSZip from 'jszip';
import { AdminMetadata } from '../../types';
import { extractVietnameseAdminMetadata } from '../vietnameseAdminExtractor';

export interface PPTXParseResult {
  markdown: string;
  metadata: AdminMetadata;
  totalSlides: number;
}

export async function parsePPTXDocument(file: File): Promise<PPTXParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith('.ppt')) {
    throw new Error(
      'Định dạng .PPT cũ (PowerPoint 97-2003) là dạng nhị phân không hỗ trợ trực tiếp trong trình duyệt. Vui lòng lưu lại thành .PPTX hoặc xuất sang PDF.'
    );
  }

  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)![1], 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)![1], 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('Không tìm thấy slide nào trong file trình chiếu PPTX.');
  }

  const parser = new DOMParser();
  const slideMarkdowns: string[] = [];
  let combinedText = '';

  for (let i = 0; i < slideFiles.length; i++) {
    const slideXmlStr = await zip.files[slideFiles[i]].async('text');
    const xmlDoc = parser.parseFromString(slideXmlStr, 'application/xml');

    // Extract title
    let slideTitle = '';
    const titleShape = xmlDoc.querySelector('p\\:sp:has(p\\:nvSpPr p\\:ph[type="title"]), p\\:sp:has(p\\:nvSpPr p\\:ph[type="ctrTitle"])');
    if (titleShape) {
      const titleTexts = Array.from(titleShape.querySelectorAll('a\\:t')).map(t => t.textContent || '');
      slideTitle = titleTexts.join(' ').trim();
    }

    // Extract all text paragraphs
    const paragraphs = Array.from(xmlDoc.querySelectorAll('a\\:p'));
    const bodyLines: string[] = [];

    for (const p of paragraphs) {
      const textElements = Array.from(p.querySelectorAll('a\\:t')).map(t => t.textContent || '');
      const pText = textElements.join('').trim();
      if (pText && pText !== slideTitle) {
        bodyLines.push(`- ${pText}`);
      }
    }

    const slideHeading = slideTitle ? `## Slide ${i + 1}: ${slideTitle}` : `## Slide ${i + 1}`;
    const slideContent = [slideHeading, ...bodyLines].join('\n');
    slideMarkdowns.push(slideContent);
    combinedText += ' ' + slideTitle + ' ' + bodyLines.join(' ');
  }

  const metadata = extractVietnameseAdminMetadata(combinedText);

  return {
    markdown: slideMarkdowns.join('\n\n---\n\n'),
    metadata,
    totalSlides: slideFiles.length
  };
}
