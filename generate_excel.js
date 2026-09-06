import fs from 'fs';
import * as xlsx from 'xlsx';

const subjectCodeMap = {
  'Giáo dục thể chất': 'GDTC',
  'GDCD': 'GDCD',
  'GDĐP': 'GDĐP',
  'Ngữ văn': 'VAN',
  'HĐTN': 'HĐTN',
  'Lịch sử và địa lý': 'LSU_DIA',
  'Khoa học Tự nhiên': 'KHTN',
  'Ngoại ngữ 1': 'ANH',
  'Tin học': 'TIN',
  'Toán': 'TOAN',
  'Công nghệ': 'CN',
  'Nghệ thuật': 'NGHETHUAT'
};

const periodsMap = {
  'TOAN': 4,
  'VAN': 4,
  'KHTN': 4,
  'ANH': 3,
  'LSU_DIA': 3,
  'GDTC': 2,
  'NGHETHUAT': 2,
  'TIN': 1,
  'GDCD': 1,
  'GDĐP': 1,
  'HĐTN': 3,
  'CN': 1
};

const ocrText = fs.readFileSync('ocr.txt', 'utf-8');
const lines = ocrText.split('\n').filter(l => l.trim() !== '');

const assignments = [];

lines.forEach(line => {
  const match = line.match(/^(\d+)\s+(\d{10})\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})\s*(.*)$/);
  if (match) {
    const stt = match[1];
    const maGv = match[2];
    const tenGv = match[3].trim();
    const dob = match[4];
    const monDayRaw = match[5].trim();

    if (monDayRaw) {
      // Split by "), " but keep the logic robust
      const subjectParts = monDayRaw.split(/\)\s*,?\s*/).filter(p => p.trim() !== '');
      
      subjectParts.forEach(part => {
        const subMatch = part.match(/^(.*?)\(\s*(.*?)\s*$/);
        if (subMatch) {
          const subjectName = subMatch[1].trim();
          const classes = subMatch[2].trim();
          
          const maMon = subjectCodeMap[subjectName] || subjectName;
          const soTiet = periodsMap[maMon] || 2; // Default 2 periods if unknown

          assignments.push({
            'Mã GV (*)': maGv,
            'Tên GV': tenGv,
            'Mã Môn (*)': maMon,
            'Lớp (*)': classes,
            'Số tiết/tuần (*)': soTiet
          });
        }
      });
    }
  }
});

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(assignments);
xlsx.utils.book_append_sheet(wb, ws, 'Phân công');

// Adjust column widths
const colWidths = [
  { wch: 15 }, // Mã GV
  { wch: 25 }, // Tên GV
  { wch: 15 }, // Mã Môn
  { wch: 40 }, // Lớp
  { wch: 15 }  // Số tiết/tuần
];
ws['!cols'] = colWidths;

xlsx.writeFile(wb, '../Data_Phan_Cong_Chuyen_Mon.xlsx');
console.log(`Generated Data_Phan_Cong_Chuyen_Mon.xlsx with ${assignments.length} assignments.`);
