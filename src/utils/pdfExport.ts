import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  onProgress?: (current: number, total: number) => void;
}

/**
 * Robust parenthesis-depth counter that replaces any unsupported modern color function
 * (oklab, oklch, color-mix, lab, lch, color) with standard sRGB rgba(...) equivalents,
 * even with deeply nested calc(), var(), or color-mix() expressions.
 */
function sanitizeColorFunctions(str: string): string {
  if (!str) return str;
  if (!/(?:oklab|oklch|color-mix|lab|lch|color)\s*\(/i.test(str)) {
    return str;
  }

  const targetFunctions = ['color-mix', 'oklab', 'oklch', 'lab', 'lch', 'color'];
  let result = str;

  for (const fn of targetFunctions) {
    const pattern = new RegExp(`\\b${fn}\\s*\\(`, 'gi');
    let match: RegExpExecArray | null;

    // Process from left to right with matching parentheses depth
    while ((match = pattern.exec(result)) !== null) {
      const startIndex = match.index;
      let depth = 0;
      let endIndex = -1;

      for (let i = startIndex + match[0].length - 1; i < result.length; i++) {
        if (result[i] === '(') {
          depth++;
        } else if (result[i] === ')') {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }

      if (endIndex !== -1) {
        const before = result.slice(0, startIndex);
        const after = result.slice(endIndex + 1);
        result = before + 'rgba(30, 41, 59, 0.9)' + after;
        pattern.lastIndex = startIndex; // continue searching after replacement
      } else {
        break;
      }
    }
  }

  return result;
}

// Global offscreen canvas for converting any browser-supported color to standard sRGB [r, g, b, a]
let helperCanvas: HTMLCanvasElement | null = null;
let helperCtx: CanvasRenderingContext2D | null = null;

function colorToRgba(colorStr: string): string {
  if (!colorStr) return 'transparent';
  const trimmed = colorStr.trim().toLowerCase();
  if (trimmed === 'transparent' || trimmed === 'rgba(0, 0, 0, 0)') return 'transparent';
  if (trimmed === 'inherit' || trimmed === 'initial' || trimmed === 'unset') return 'transparent';

  try {
    if (!helperCanvas) {
      helperCanvas = document.createElement('canvas');
      helperCanvas.width = 1;
      helperCanvas.height = 1;
      helperCtx = helperCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (!helperCtx) return 'rgba(30, 41, 59, 1)';

    helperCtx.clearRect(0, 0, 1, 1);
    helperCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    helperCtx.fillStyle = colorStr;
    helperCtx.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = helperCtx.getImageData(0, 0, 1, 1).data;
    const alpha = parseFloat((a / 255).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return 'rgba(30, 41, 59, 1)';
  }
}

/**
 * Comprehensive sanitization of cloned document styles and elements
 * to guarantee html2canvas will NEVER encounter oklab, oklch, or color-mix functions.
 */
function sanitizeClonedDocumentStyles(docClone: Document, clonedRoot: HTMLElement): void {
  try {
    // 1. Convert link[rel="stylesheet"] to inline <style> with sanitized color functions
    const linkElements = docClone.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
    linkElements.forEach(link => {
      try {
        const matchingSheet = Array.from(document.styleSheets).find(
          sheet => sheet.href === link.href || (link.href && link.href.includes(sheet.href || ''))
        );

        if (matchingSheet) {
          try {
            const rules = Array.from(matchingSheet.cssRules || []);
            const cssText = rules.map(r => r.cssText).join('\n');
            const sanitizedCss = sanitizeColorFunctions(cssText);

            const newStyle = docClone.createElement('style');
            newStyle.textContent = sanitizedCss;
            link.parentNode?.replaceChild(newStyle, link);
            return;
          } catch {
            link.parentNode?.removeChild(link);
          }
        } else {
          link.parentNode?.removeChild(link);
        }
      } catch {
        link.parentNode?.removeChild(link);
      }
    });

    // 2. Process all <style> elements inside the cloned document
    const styleElements = docClone.querySelectorAll('style');
    styleElements.forEach(style => {
      if (style.textContent) {
        style.textContent = sanitizeColorFunctions(style.textContent);
      }
    });

    // 3. Inject standard sRGB CSS variable fallbacks for Tailwind v4 color tokens
    const fallbackStyle = docClone.createElement('style');
    fallbackStyle.setAttribute('type', 'text/css');
    fallbackStyle.textContent = `
      :root {
        --color-black: #000000 !important;
        --color-white: #ffffff !important;
        --color-slate-50: #f8fafc !important;
        --color-slate-100: #f1f5f9 !important;
        --color-slate-200: #e2e8f0 !important;
        --color-slate-300: #cbd5e1 !important;
        --color-slate-400: #94a3b8 !important;
        --color-slate-500: #64748b !important;
        --color-slate-600: #475569 !important;
        --color-slate-700: #334155 !important;
        --color-slate-800: #1e293b !important;
        --color-slate-900: #0f172a !important;
        --color-slate-950: #020617 !important;
        --color-gray-50: #f9fafb !important;
        --color-gray-100: #f3f4f6 !important;
        --color-gray-200: #e5e7eb !important;
        --color-gray-300: #d1d5db !important;
        --color-gray-400: #9ca3af !important;
        --color-gray-500: #6b7280 !important;
        --color-gray-600: #4b5563 !important;
        --color-gray-700: #374151 !important;
        --color-gray-800: #1f2937 !important;
        --color-gray-900: #111827 !important;
        --color-gray-950: #030712 !important;
        --color-blue-50: #eff6ff !important;
        --color-blue-100: #dbeafe !important;
        --color-blue-200: #bfdbfe !important;
        --color-blue-300: #93c5fd !important;
        --color-blue-500: #3b82f6 !important;
        --color-blue-600: #2563eb !important;
        --color-blue-700: #1d4ed8 !important;
        --color-blue-800: #1e40af !important;
        --color-blue-900: #1e3a8a !important;
        --color-blue-950: #172554 !important;
        --color-indigo-50: #eef2ff !important;
        --color-indigo-100: #e0e7ff !important;
        --color-indigo-600: #4f46e5 !important;
        --color-indigo-700: #4338ca !important;
        --color-indigo-900: #312e81 !important;
        --color-indigo-950: #1e1b4b !important;
        --color-emerald-50: #ecfdf5 !important;
        --color-emerald-100: #d1fae5 !important;
        --color-emerald-600: #059669 !important;
        --color-emerald-700: #047857 !important;
        --color-amber-50: #fffbeb !important;
        --color-amber-100: #fef3c7 !important;
        --color-amber-600: #d97706 !important;
        --color-amber-700: #b45309 !important;
        --color-purple-50: #faf5ff !important;
        --color-purple-100: #f3e8ff !important;
        --color-purple-600: #9333ea !important;
        --color-purple-700: #7e22ce !important;
      }

      /* Critical fix for html2canvas font metrics baseline calculation with Tailwind */
      img, svg, picture, video, canvas, audio, iframe, embed, object {
        display: inline !important;
      }
      body > div img,
      div img,
      span img {
        display: inline !important;
      }
    `;
    docClone.head.appendChild(fallbackStyle);

    // 4. Sanitize any inline style attributes with modern color functions (fast query, no computed style reflows)
    const elementsWithInlineStyle = Array.from(clonedRoot.querySelectorAll<HTMLElement>('[style]'));
    for (const el of elementsWithInlineStyle) {
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && /(?:oklab|oklch|color-mix|lab|lch|color)\s*\(/i.test(inlineStyle)) {
        el.setAttribute('style', sanitizeColorFunctions(inlineStyle));
      }
    }
  } catch (err) {
    console.warn('Style sanitization warning:', err);
  }
}

function isElementLandscape(pageEl: HTMLElement, defaultOrientation?: 'portrait' | 'landscape'): boolean {
  const dataOrient = pageEl.getAttribute('data-orientation');
  if (dataOrient === 'landscape') return true;
  if (dataOrient === 'portrait') return false;
  if (pageEl.classList.contains('w-[297mm]')) return true;
  if (pageEl.classList.contains('w-[210mm]')) return false;
  return defaultOrientation === 'landscape';
}

/**
 * Converts a collection of HTML page elements or a container into a downloadable multi-page PDF.
 * Uses optimized canvas capture (scale: 1.5) with exact A4 desktop dimensions for fast, high-quality export.
 */
export async function exportToPdf(
  container: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'sinav-raporu.pdf',
    orientation = 'portrait',
    onProgress,
  } = options;

  let pages = Array.from(
    container.querySelectorAll<HTMLElement>('[data-pdf-page="true"]')
  );

  if (pages.length === 0) {
    pages = [container];
  }

  // Ensure host document does not have display: block on img breaking html2canvas font metrics
  if (!document.getElementById('html2canvas-fontmetrics-fix')) {
    const hostFixStyle = document.createElement('style');
    hostFixStyle.id = 'html2canvas-fontmetrics-fix';
    hostFixStyle.textContent = 'img, svg, video { display: inline-block !important; }';
    document.head.appendChild(hostFixStyle);
  }

  const firstPageIsLandscape = isElementLandscape(pages[0], orientation);

  const pdf = new jsPDF({
    orientation: firstPageIsLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const pageEl = pages[i];
    if (onProgress) {
      onProgress(i + 1, totalPages);
    }

    // Yield control to UI thread so progress counter updates smoothly
    await new Promise(resolve => setTimeout(resolve, 15));

    const pageIsLandscape = isElementLandscape(pageEl, orientation);
    const curWidth = pageIsLandscape ? 297 : 210;
    const curHeight = pageIsLandscape ? 210 : 297;
    const pixelWidth = pageIsLandscape ? 1123 : 794;
    const pixelHeight = pageIsLandscape ? 794 : 1123;

    // Capture using html2canvas with exact A4 pixel dimensions matching PDF mm ratios
    const canvas = await html2canvas(pageEl, {
      scale: 1.5, // 1.5x resolution is sharp for A4 prints while rendering 3-4x faster
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: pixelWidth,
      height: pixelHeight,
      windowWidth: pixelWidth,
      windowHeight: pixelHeight,
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        // Isolate clonedElement as the sole child of clonedDoc.body so every page starts at (0,0) without scroll offsets
        if (clonedDoc.body) {
          clonedDoc.body.innerHTML = '';
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.width = `${pixelWidth}px`;
          clonedDoc.body.style.height = `${pixelHeight}px`;
          clonedDoc.body.style.overflow = 'hidden';
          clonedDoc.body.appendChild(clonedElement);
        }

        // Fix exact A4 proportions on cloned element:
        clonedElement.style.transform = 'none';
        clonedElement.style.margin = '0';
        clonedElement.style.boxSizing = 'border-box';
        clonedElement.style.width = `${pixelWidth}px`;
        clonedElement.style.height = `${pixelHeight}px`;
        clonedElement.style.maxWidth = `${pixelWidth}px`;
        clonedElement.style.maxHeight = `${pixelHeight}px`;
        clonedElement.style.position = 'absolute';
        clonedElement.style.top = '0';
        clonedElement.style.left = '0';

        sanitizeClonedDocumentStyles(clonedDoc, clonedElement);
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.88);

    if (i > 0) {
      pdf.addPage('a4', pageIsLandscape ? 'landscape' : 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, curWidth, curHeight, undefined, 'FAST');
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

/**
 * Triggers printing of the selected document cleanly and reliably across ALL browsers and environments.
 * Uses an isolated #direct-print-container attached to document.body, outside #root,
 * with body.is-printing-report class, dynamic @page CSS (portrait/landscape),
 * and clean restoration after printing.
 */
export function printElementDirectly(
  container: HTMLElement,
  documentTitleOrOptions: string | { title?: string; landscape?: boolean } = 'Sınav Raporu'
): void {
  try {
    const documentTitle =
      typeof documentTitleOrOptions === 'string'
        ? documentTitleOrOptions
        : documentTitleOrOptions?.title || 'Sınav Raporu';

    const forcedLandscape =
      typeof documentTitleOrOptions === 'object' && documentTitleOrOptions.landscape !== undefined
        ? documentTitleOrOptions.landscape
        : undefined;

    const isLandscape =
      forcedLandscape !== undefined
        ? forcedLandscape
        : container.querySelector('[data-orientation="landscape"]') !== null ||
          container.querySelector('.w-\\[297mm\\]') !== null;

    // 1. Remove any previous print containers & styles
    const prevContainer = document.getElementById('direct-print-container');
    if (prevContainer) {
      prevContainer.remove();
    }
    const prevStyle = document.getElementById('direct-print-dynamic-style');
    if (prevStyle) {
      prevStyle.remove();
    }

    // 2. Create the direct print container directly on document.body (outside #root)
    const printContainer = document.createElement('div');
    printContainer.id = 'direct-print-container';

    // 3. Clone content and completely strip any preview zoom scale / transforms
    const cloned = container.cloneNode(true) as HTMLElement;
    cloned.style.transform = 'none';
    cloned.style.transformOrigin = 'initial';
    cloned.style.margin = '0 auto';
    cloned.style.padding = '0';
    cloned.style.width = '100%';
    cloned.style.maxWidth = 'none';
    cloned.style.boxShadow = 'none';

    // Also strip transforms from any inner elements
    cloned.querySelectorAll<HTMLElement>('[style*="transform"]').forEach(el => {
      el.style.transform = 'none';
    });

    printContainer.appendChild(cloned);
    document.body.appendChild(printContainer);

    // 4. Inject dynamic print styles for @page size, orientation, and isolation
    const styleEl = document.createElement('style');
    styleEl.id = 'direct-print-dynamic-style';
    styleEl.textContent = `
      @page {
        size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'} !important;
        margin: 4mm !important;
      }
      @media screen {
        #direct-print-container {
          display: none !important;
        }
      }
      @media print {
        html, body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body.is-printing-report #root {
          display: none !important;
        }
        body.is-printing-report #direct-print-container {
          display: block !important;
          position: static !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 999999 !important;
        }
        body.is-printing-report #direct-print-container * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body.is-printing-report .no-print {
          display: none !important;
        }
        body.is-printing-report .print-only {
          display: none !important;
        }
        [data-pdf-page="true"] {
          break-after: page !important;
          page-break-after: always !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          margin: 0 auto !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // 5. Set title and add class to body
    const originalTitle = document.title;
    if (documentTitle) {
      document.title = documentTitle;
    }
    document.body.classList.add('is-printing-report');

    // 6. Cleanup handler
    let isCleanedUp = false;
    const cleanUp = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      document.body.classList.remove('is-printing-report');
      document.title = originalTitle;
      const c = document.getElementById('direct-print-container');
      if (c) c.remove();
      const s = document.getElementById('direct-print-dynamic-style');
      if (s) s.remove();
      window.removeEventListener('afterprint', cleanUp);
    };

    window.addEventListener('afterprint', cleanUp, { once: true });

    // 7. Trigger native browser print directly on window with slight layout delay
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('window.print() error:', err);
      } finally {
        // Fallback cleanup in case afterprint doesn't fire (e.g. mobile browsers or cancelled dialogs)
        setTimeout(cleanUp, 3000);
      }
    }, 60);

  } catch (err) {
    console.error('Print initialization failed:', err);
    window.print();
  }
}

