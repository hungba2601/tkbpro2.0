import * as xlsx from 'xlsx';

export const parseExcelSheet = (file: File, sheetName: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = xlsx.read(data, { type: 'array' });
        
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          throw new Error(`Không tìm thấy Sheet "${sheetName}" trong file. Vui lòng kiểm tra lại.`);
        }
        
        const jsonData = xlsx.utils.sheet_to_json(sheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const exportTemplate = (sheetName: string, sampleData: any[]) => {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  xlsx.writeFile(wb, `Template_${sheetName.replace(/\s+/g, '_')}.xlsx`);
};
