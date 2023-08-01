function exportDataToExcel(data) {
    const XLSX = require('xlsx');
    const { saveAs } = require('file-saver');
  
    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([['Player Name', 'Position', 'Bye'], ...data]);
  
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Player Data');
  
    // Convert the workbook to an Excel file
    const excelFile = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  
    // Save the Excel file
    const blob = new Blob([excelFile], { type: 'application/octet-stream' });
    saveAs(blob, 'player_data.xlsx');
  }
  
  // Expose the function for exporting to Excel
  window.exportDataToExcel = exportDataToExcel;