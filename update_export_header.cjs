const fs = require('fs');
const path = require('path');

const exportExcelPath = path.join(__dirname, 'src', 'utils', 'exportExcel.ts');
let exportExcelContent = fs.readFileSync(exportExcelPath, 'utf-8');

const drawTimetableAnchor = `const drawTimetable = (
  sheet: ExcelJS.Worksheet,
  title: string,
  startRow: number,
  items: ScheduleItem[],
  viewMode: 'Lớp' | 'Giáo viên'`;

exportExcelContent = exportExcelContent.replace(drawTimetableAnchor, `const drawTimetable = (
  sheet: ExcelJS.Worksheet,
  title: string,
  startRow: number,
  items: ScheduleItem[],
  viewMode: 'Lớp' | 'Giáo viên',
  config: any = {}`);

const drawTimetableHeaderLogicOld = `  const titleRow = sheet.getRow(startRow);
  titleRow.getCell(1).value = \`THỜI KHÓA BIỂU \${viewMode.toUpperCase()}: \${title}\`;
  titleRow.getCell(1).font = { name: 'Times New Roman', size: 16, bold: true };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(startRow, 1, startRow, 7);
  titleRow.height = 30;

  const headerRow = sheet.getRow(startRow + 1);`;

const drawTimetableHeaderLogicNew = `  const titleRow = sheet.getRow(startRow);
  titleRow.getCell(1).value = \`THỜI KHÓA BIỂU \${viewMode.toUpperCase()}: \${title}\`;
  titleRow.getCell(1).font = { name: 'Times New Roman', size: 16, bold: true };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells(startRow, 1, startRow, 7);
  titleRow.height = 30;

  let headerOffset = 1;
  if (config.effectiveDate) {
    const dateRow = sheet.getRow(startRow + 1);
    dateRow.getCell(1).value = config.effectiveDate;
    dateRow.getCell(1).font = { name: 'Times New Roman', size: 12, italic: true };
    dateRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
    sheet.mergeCells(startRow + 1, 1, startRow + 1, 7);
    headerOffset = 2;
  }

  const headerRow = sheet.getRow(startRow + headerOffset);`;

exportExcelContent = exportExcelContent.replace(drawTimetableHeaderLogicOld, drawTimetableHeaderLogicNew);

exportExcelContent = exportExcelContent.replace(
  `  const headerRow = sheet.getRow(startRow + 1);`, // This is already replaced, wait
  ``
) // No, I handled it above.
// Also update startRow + 2 to startRow + headerOffset + 1
exportExcelContent = exportExcelContent.replace(
  `let currentRow = startRow + 2;`,
  `let currentRow = startRow + headerOffset + 1;`
);


const drawNewSchoolWideOld = `const drawNewSchoolWideTimetable = (
  sheet: ExcelJS.Worksheet,
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = []
) => {`;

const drawNewSchoolWideNew = `const drawNewSchoolWideTimetable = (
  sheet: ExcelJS.Worksheet,
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = [],
  config: any = {}
) => {
  sheet.pageSetup = {
    paperSize: 8, // A3
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };
`;
exportExcelContent = exportExcelContent.replace(drawNewSchoolWideOld, drawNewSchoolWideNew);

// Replace row1 and row2 definitions in drawNewSchoolWideTimetable to include the top headers
const drawNewSchoolHeaderOld = `  const row1 = sheet.addRow(['THỨ', 'TIẾT']);
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

  let currentRow = 3;`;

const drawNewSchoolHeaderNew = `
  const totalCols = 2 + classesList.length * 2;

  // Header 1: Tên trường & Tiêu đề chính
  const r1 = sheet.addRow([config.schoolName || '']);
  r1.getCell(1).font = { name: 'Times New Roman', size: 12, bold: true };
  r1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  
  const titleCell = r1.getCell(4);
  titleCell.value = 'THỜI KHOÁ BIỂU';
  titleCell.font = { name: 'Times New Roman', size: 24, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  const reportCell = r1.getCell(totalCols - 3 > 4 ? totalCols - 3 : totalCols);
  reportCell.value = config.timetableName ? \`Số \${config.timetableName}\` : '';
  reportCell.font = { name: 'Times New Roman', size: 20, bold: true };
  reportCell.alignment = { horizontal: 'right', vertical: 'middle' };

  sheet.mergeCells(1, 4, 1, totalCols - 4 > 4 ? totalCols - 4 : 5);
  r1.height = 35;

  // Header 2: Năm học, Học kỳ, Thời gian áp dụng
  const r2 = sheet.addRow([config.schoolYear || '']);
  r2.getCell(1).font = { name: 'Times New Roman', size: 12 };
  
  const dateCell = r2.getCell(totalCols - 5 > 2 ? totalCols - 5 : 3);
  dateCell.value = config.effectiveDate || '';
  dateCell.font = { name: 'Times New Roman', size: 12, italic: true };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  
  sheet.mergeCells(2, totalCols - 5 > 2 ? totalCols - 5 : 3, 2, totalCols);
  r2.height = 20;
  
  // Header 3: Học kỳ
  const r3 = sheet.addRow([config.semester || '']);
  r3.getCell(1).font = { name: 'Times New Roman', size: 12 };
  r3.height = 20;

  // Khoảng trống
  sheet.addRow([]);

  const tableStartRow = 5;

  const row1 = sheet.addRow(['THỨ', 'TIẾT']);
  let colIdx = 3;
  classesList.forEach(c => {
    sheet.getCell(tableStartRow, colIdx).value = c;
    sheet.mergeCells(tableStartRow, colIdx, tableStartRow, colIdx + 1);
    colIdx += 2;
  });

  const row2 = sheet.addRow(['', '']);
  sheet.mergeCells(\`A\${tableStartRow}:A\${tableStartRow + 1}\`);
  sheet.mergeCells(\`B\${tableStartRow}:B\${tableStartRow + 1}\`);
  colIdx = 3;
  classesList.forEach(() => {
    sheet.getCell(tableStartRow + 1, colIdx).value = 'Sáng';
    sheet.getCell(tableStartRow + 1, colIdx + 1).value = 'Chiều';
    colIdx += 2;
  });

  const headerFont = { name: 'Times New Roman', size: 11, bold: true };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
  
  [tableStartRow, tableStartRow + 1].forEach(r => {
    sheet.getRow(r).eachCell({ includeEmpty: true }, cell => {
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });
  });

  let currentRow = tableStartRow + 2;`;

exportExcelContent = exportExcelContent.replace(drawNewSchoolHeaderOld, drawNewSchoolHeaderNew);

const exportTimetableToExcelOld = `export const exportTimetableToExcel = async (
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = []
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TKB Pro';
  workbook.created = new Date();`;

const exportTimetableToExcelNew = `export const exportTimetableToExcel = async (
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = []
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TKB Pro';
  workbook.created = new Date();

  let config = {};
  try {
    const stored = localStorage.getItem('tkb_config');
    if (stored) config = JSON.parse(stored);
  } catch(e) {}
`;

exportExcelContent = exportExcelContent.replace(exportTimetableToExcelOld, exportTimetableToExcelNew);

// Update calls to pass config
exportExcelContent = exportExcelContent.replace(
  `drawNewSchoolWideTimetable(newSchoolSheet, schedule, classesList, teachersList, subjectsList);`,
  `drawNewSchoolWideTimetable(newSchoolSheet, schedule, classesList, teachersList, subjectsList, config);`
);

exportExcelContent = exportExcelContent.replace(
  `currentRow = drawTimetable(classSheet, classId, currentRow, classSchedule, 'Lớp');`,
  `currentRow = drawTimetable(classSheet, classId, currentRow, classSchedule, 'Lớp', config);`
);

exportExcelContent = exportExcelContent.replace(
  `currentRow = drawTimetable(teacherSheet, teacherName, currentRow, teacherSchedule, 'Giáo viên');`,
  `currentRow = drawTimetable(teacherSheet, teacherName, currentRow, teacherSchedule, 'Giáo viên', config);`
);


fs.writeFileSync(exportExcelPath, exportExcelContent);
console.log("Done updating exportExcel.ts");
