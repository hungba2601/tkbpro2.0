const fs = require('fs');
const path = require('path');

const exportExcelPath = path.join(__dirname, 'src', 'utils', 'exportExcel.ts');
let exportExcelContent = fs.readFileSync(exportExcelPath, 'utf-8');

const timetableSectionPath = path.join(__dirname, 'src', 'components', 'TimetableSection.tsx');
let timetableSectionContent = fs.readFileSync(timetableSectionPath, 'utf-8');

// 1. Add drawNewSchoolWideTimetable to exportExcel.ts
const drawNewSchoolWideTimetableCode = `
const drawNewSchoolWideTimetable = (
  sheet: ExcelJS.Worksheet,
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = []
) => {
  const days = [2, 3, 4, 5, 6, 7];
  const periods = [1, 2, 3, 4, 5];

  // Map tra cứu giáo viên: Mã GV -> Tên GV
  const teacherMap = new Map<string, string>();
  teachersList.forEach(t => {
    const id = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
    const name = String(t['Họ và tên (*)'] || t['Tên GV'] || t['Họ và tên'] || '').trim();
    if (id) {
      teacherMap.set(id, name || id);
    }
  });

  // Map tra cứu môn học: Mã Môn -> Tên Môn
  const subjectMap = new Map<string, string>();
  subjectsList.forEach(s => {
    const id = String(s['Mã Môn (*)'] || s['Mã Môn'] || '').trim();
    const name = String(s['Tên Môn (*)'] || s['Tên Môn'] || '').trim();
    if (id) {
      subjectMap.set(id, name || id);
    }
  });

  const cols = [
    { width: 8 }, // THỨ
    { width: 8 }, // TIẾT
  ];
  classesList.forEach(() => {
    cols.push({ width: 14 }); // Sáng
    cols.push({ width: 14 }); // Chiều
  });
  sheet.columns = cols as any;

  const row1 = sheet.addRow(['THỨ', 'TIẾT']);
  let colIdx = 3;
  classesList.forEach(c => {
    sheet.getCell(1, colIdx).value = c;
    sheet.mergeCells(1, colIdx, 1, colIdx + 1);
    colIdx += 2;
  });

  const row2 = sheet.addRow(['', '']);
  sheet.mergeCells('A1:A2');
  sheet.mergeCells('B1:B2');
  colIdx = 3;
  classesList.forEach(() => {
    sheet.getCell(2, colIdx).value = 'Sáng';
    sheet.getCell(2, colIdx + 1).value = 'Chiều';
    colIdx += 2;
  });

  const headerFont = { name: 'Times New Roman', size: 11, bold: true };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  
  [1, 2].forEach(r => {
    sheet.getRow(r).eachCell({ includeEmpty: true }, cell => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });
  });

  let currentRow = 3;
  days.forEach(day => {
    const startDayRow = currentRow;
    periods.forEach((p, pIndex) => {
      const rowData = [pIndex === 0 ? \`Thứ \${day}\` : '', p];
      const row = sheet.addRow(rowData);
      
      colIdx = 3;
      classesList.forEach(c => {
        const itemSang = schedule.find(s => s.classId === c && s.day === day && s.period === p);
        const itemChieu = schedule.find(s => s.classId === c && s.day === day && s.period === p + 5);

        const fillCell = (item: ScheduleItem | undefined, colOffset: number) => {
          const cell = row.getCell(colIdx + colOffset);
          if (item) {
            const teacherId = String(item.teacherId || '').trim();
            const teacherName = teacherMap.get(teacherId) || teacherId;
            const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;
            
            const richText: any[] = [
              { font: { bold: true, name: 'Times New Roman', size: 10 }, text: subjectDisplayName + '\\n' },
              { font: { italic: true, name: 'Times New Roman', size: 10, color: { argb: 'FF2563EB' } }, text: teacherName }
            ];
            if (item.roomId) {
              richText.push({ font: { name: 'Times New Roman', size: 10, color: { argb: 'FF059669' } }, text: '\\n' + item.roomId });
            }
            cell.value = { richText };
          }
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = thinBorder;
        };

        fillCell(itemSang, 0);
        fillCell(itemChieu, 1);
        colIdx += 2;
      });

      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(1).font = { name: 'Times New Roman', size: 14, bold: true };
      row.getCell(1).border = thinBorder;
      
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).font = { name: 'Times New Roman', size: 11, bold: true };
      row.getCell(2).border = thinBorder;

      currentRow++;
    });
    
    sheet.mergeCells(startDayRow, 1, currentRow - 1, 1);
  });
};
`;

// Insert the drawNewSchoolWideTimetable before exportTimetableToExcel
exportExcelContent = exportExcelContent.replace(
  'export const exportTimetableToExcel = async (',
  drawNewSchoolWideTimetableCode + '\nexport const exportTimetableToExcel = async ('
);

// Update exportTimetableToExcel to include the new sheet
const oldSheetLogic = `  if (classesList.length > 0) {
    const schoolSheet = workbook.addWorksheet('TKB Toàn trường', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    drawSchoolWideTimetable(schoolSheet, schedule, classesList, teachersList, subjectsList);
  }`;
  
const newSheetLogic = `  if (classesList.length > 0) {
    const newSchoolSheet = workbook.addWorksheet('TKB Toàn trường', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    drawNewSchoolWideTimetable(newSchoolSheet, schedule, classesList, teachersList, subjectsList);
    
    const schoolSheet = workbook.addWorksheet('TKB Toàn trường CSDL', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    drawSchoolWideTimetable(schoolSheet, schedule, classesList, teachersList, subjectsList);
  }`;
exportExcelContent = exportExcelContent.replace(oldSheetLogic, newSheetLogic);
fs.writeFileSync(exportExcelPath, exportExcelContent);


// 2. Remove exportNewSchoolTimetableToExcel from TimetableSection.tsx
// Find where it starts and where it ends
const startFnStr = '  const exportNewSchoolTimetableToExcel = async () => {';
const endFnStr = '  const renderNewSchoolWideGrid = () => {';

let startIndex = timetableSectionContent.indexOf(startFnStr);
let endIndex = timetableSectionContent.indexOf(endFnStr);

if (startIndex !== -1 && endIndex !== -1) {
    timetableSectionContent = timetableSectionContent.substring(0, startIndex) + timetableSectionContent.substring(endIndex);
}

// 3. Update the button to call the main export function
timetableSectionContent = timetableSectionContent.replace(
    'exportNewSchoolTimetableToExcel()',
    'exportTimetableToExcel(schedule, classesList, teachersList, subjectsList)'
);

fs.writeFileSync(timetableSectionPath, timetableSectionContent);
console.log('Update done');
