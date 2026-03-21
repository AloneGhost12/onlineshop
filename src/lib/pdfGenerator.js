/**
 * Generate and download a PDF from an HTML element
 * @param {HTMLElement} element - The HTML element to convert to PDF
 * @param {string} filename - The name of the PDF file to download
 * @param {Object} options - Optional configuration for PDF generation
 * @returns {Promise<void>}
 */
export const generatePDF = async (element, filename = 'document.pdf', options = {}) => {
  if (!element) {
    throw new Error('Element is required for PDF generation');
  }

  // Dynamically import html2pdf only on client side
  const html2pdf = (await import('html2pdf.js')).default;

  // Default options for html2pdf
  const defaultOptions = {
    margin: [10, 10, 10, 10], // margins in mm
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  };

  // Merge user options with defaults
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    await html2pdf()
      .set(mergedOptions)
      .from(element)
      .save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF: ' + error.message);
  }
};

/**
 * Generate a PDF for an address label with specific dimensions suitable for courier labels
 * @param {HTMLElement} element - The address label HTML element
 * @param {string} orderNumber - The order number for filename
 * @returns {Promise<void>}
 */
export const generateAddressLabelPDF = async (element, orderNumber) => {
  if (!element) {
    throw new Error('Element is required for PDF generation');
  }

  // Dynamically import html2pdf only on client side
  const html2pdf = (await import('html2pdf.js')).default;

  const filename = `Address_Label_Order_${orderNumber || 'Unknown'}_${new Date().getTime()}.pdf`;

  const options = {
    margin: [5, 5, 5, 5], // Smaller margins for labels
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 800,
      ignoreElements: (el) => {
        // Ignore script and style tags
        return el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
      },
    },
    jsPDF: {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // Standard A4 size
    },
  };

  try {
    // Clone element to manipulate without affecting original
    const clonedElement = element.cloneNode(true);

    // Inline critical CSS to avoid lab() color parsing issues
    const allElements = clonedElement.querySelectorAll('*');
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el);

      // Set basic inline styles to override Tailwind classes
      if (!el.style.color) {
        el.style.color = computed.color || '#000000';
      }
      if (!el.style.backgroundColor) {
        el.style.backgroundColor = computed.backgroundColor || 'transparent';
      }
      if (!el.style.borderColor) {
        el.style.borderColor = computed.borderColor || '#000000';
      }
    });

    await html2pdf()
      .set(options)
      .from(clonedElement)
      .save();
  } catch (error) {
    console.error('Error generating address label PDF:', error);
    throw new Error('Failed to generate address label PDF: ' + error.message);
  }
};

/**
 * Generate a PDF and get the blob instead of auto-downloading
 * @param {HTMLElement} element - The HTML element to convert to PDF
 * @param {Object} options - Optional configuration for PDF generation
 * @returns {Promise<Blob>}
 */
export const generatePDFBlob = async (element, options = {}) => {
  if (!element) {
    throw new Error('Element is required for PDF generation');
  }

  // Dynamically import html2pdf only on client side
  const html2pdf = (await import('html2pdf.js')).default;

  const defaultOptions = {
    margin: [10, 10, 10, 10],
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const pdf = html2pdf()
      .set(mergedOptions)
      .from(element);

    return new Promise((resolve, reject) => {
      pdf
        .toPdf()
        .get('pdf')
        .then(() => {
          const blob = pdf.output('blob');
          resolve(blob);
        })
        .catch(reject);
    });
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw new Error('Failed to generate PDF blob: ' + error.message);
  }
};

export default {
  generatePDF,
  generateAddressLabelPDF,
  generatePDFBlob,
};
