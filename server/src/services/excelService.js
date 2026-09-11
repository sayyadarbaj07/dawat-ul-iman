const ExcelJS = require('exceljs');

class ExcelService {
  /**
   * Generates a stylized Excel buffer for generic tabular data
   * @param {Object} options
   * @param {string} options.title - Report title
   * @param {string} [options.subtitle] - Report subtitle (filters, date range)
   * @param {Array<{header: string, key: string, width?: number}>} options.columns
   * @param {Array<Object>} options.data
   * @returns {Promise<Buffer>}
   */
  async generateReport({ title, subtitle, columns, data }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dawat-ul-Iman Madrasa';
    workbook.lastModifiedBy = 'Dawat-ul-Iman Madrasa';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Report', {
      views: [{ state: 'frozen', ySplit: subtitle ? 4 : 3 }]
    });

    // Add Title
    sheet.mergeCells('A1', `${String.fromCharCode(64 + columns.length)}1`);
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }; // Teal color
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    let headerRowIndex = 3;

    // Add Subtitle if provided
    if (subtitle) {
      sheet.mergeCells('A2', `${String.fromCharCode(64 + columns.length)}2`);
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = subtitle;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRowIndex = 4;
    }

    // Define columns
    sheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || Math.max(col.header.length + 5, 15) // Auto width approx
    }));

    // Style Header Row
    const headerRow = sheet.getRow(headerRowIndex);
    headerRow.values = columns.map(col => col.header);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    headerRow.border = {
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    };
    
    // Add Data
    if (data && data.length > 0) {
      data.forEach(row => {
        sheet.addRow(row);
      });
    } else {
      sheet.addRow({ [columns[0].key]: 'No data found for the selected criteria.' });
    }

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new ExcelService();
