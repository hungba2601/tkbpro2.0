import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ScheduleItem } from './scheduler';
import { getUserItem } from './userStorage';

const DAYS = [2, 3, 4, 5, 6, 7];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const setupSheet = (sheet: ExcelJS.Worksheet) => {
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
  };

  sheet.columns = [
    { header: '', key: 'period', width: 12 },
    { header: '', key: 'day2', width: 20 },
    { header: '', key: 'day3', width: 20 },
    { header: '', key: 'day4', width: 20 },
    { header: '', key: 'day5', width: 20 },
    { header: '', key: 'day6', width: 20 },
    { header: '', key: 'day7', width: 20 },
  ];
};

const drawTimetable = (
  sheet: ExcelJS.Worksheet,
  title: string,
  startRow: number,
  items: ScheduleItem[],
  viewMode: 'Lớp' | 'Giáo viên',
  config: any = {}
) => {
  const titleRow = sheet.getRow(startRow);
  titleRow.getCell(1).value = `THỜI KHÓA BIỂU ${viewMode.toUpperCase()}: ${title}`;
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

  const headerRow = sheet.getRow(startRow + headerOffset);
  headerRow.values = ['Tiết \\ Thứ', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  headerRow.font = { name: 'Times New Roman', size: 12, bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;
  
  for (let i = 1; i <= 7; i++) {
    const cell = headerRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  let currentRow = startRow + headerOffset + 1;
  PERIODS.forEach(p => {
    const row = sheet.getRow(currentRow);
    const isAfternoon = p > 5;
    const displayPeriod = isAfternoon ? p - 5 : p;
    
    const periodCell = row.getCell(1);
    periodCell.value = `Tiết ${displayPeriod}\n(${isAfternoon ? 'Chiều' : 'Sáng'})`;
    periodCell.font = { name: 'Times New Roman', size: 11, bold: true };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    periodCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    DAYS.forEach((d, index) => {
      const colIndex = index + 2;
      const cell = row.getCell(colIndex);
      
      const item = items.find(i => i.day === d && i.period === p);
      if (item) {
        const line1 = item.subjectId;
        const line2 = viewMode === 'Lớp' ? item.teacherId : item.classId;
        
        const richTextConfig: any[] = [
          { font: { bold: true, name: 'Times New Roman', size: 11 }, text: line1 + '\n' },
          { font: { name: 'Times New Roman', size: 10 }, text: line2 }
        ];

        if (item.roomId) {
          richTextConfig.push({ font: { name: 'Times New Roman', size: 10, color: { argb: 'FF0EA5E9' } }, text: '\n' + item.roomId });
        }

        cell.value = { richText: richTextConfig };
      } else {
        cell.value = '-';
        cell.font = { name: 'Times New Roman', size: 11, color: { argb: 'FF999999' } };
      }
      
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    row.height = 45;
    
    if (p === 5) {
      for (let i = 1; i <= 7; i++) {
        row.getCell(i).border = {
          top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' },
          bottom: { style: 'medium' }
        };
      }
    }
    
    currentRow++;
  });
  
  return currentRow + 3;
};

/**
 * Tạo sheet TKB Toàn trường chuẩn 16 cột theo mẫu:
 * Cột A: #
 * Cột B: Lớp
 * Cột C: Mã buổi học (SANG, TRUA, CHIEU)
 * Cột D: Tiết học (1..5)
 * Cột E - P: Thứ 2 đến Thứ 7 (Mỗi ngày gồm 2 cột: Môn học và Giáo viên)
 * Ô Giáo viên hiển thị: Tên GV\n(Mã GV)
 */
const drawSchoolWideTimetable = (
  sheet: ExcelJS.Worksheet,
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = []
) => {
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };

  // Thiết lập độ rộng 16 cột
  sheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'lop', width: 12 },
    { key: 'buoi', width: 14 },
    { key: 'tiet', width: 10 },
    { key: 'mon_t2', width: 18 },
    { key: 'gv_t2', width: 24 },
    { key: 'mon_t3', width: 18 },
    { key: 'gv_t3', width: 24 },
    { key: 'mon_t4', width: 18 },
    { key: 'gv_t4', width: 24 },
    { key: 'mon_t5', width: 18 },
    { key: 'gv_t5', width: 24 },
    { key: 'mon_t6', width: 18 },
    { key: 'gv_t6', width: 24 },
    { key: 'mon_t7', width: 18 },
    { key: 'gv_t7', width: 24 },
  ];

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

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 1. Header Dòng 1
  const row1 = sheet.getRow(1);
  row1.height = 28;
  row1.getCell(1).value = '#';
  row1.getCell(2).value = 'Lớp';
  row1.getCell(3).value = 'Mã buổi học';
  row1.getCell(4).value = 'Tiết học';

  // Gộp các ngày trong tuần
  const daysHeader = [
    { day: 'Thứ 2', startCol: 5 },
    { day: 'Thứ 3', startCol: 7 },
    { day: 'Thứ 4', startCol: 9 },
    { day: 'Thứ 5', startCol: 11 },
    { day: 'Thứ 6', startCol: 13 },
    { day: 'Thứ 7', startCol: 15 },
  ];

  daysHeader.forEach(({ day, startCol }) => {
    row1.getCell(startCol).value = day;
    sheet.mergeCells(1, startCol, 1, startCol + 1);
  });

  // Gộp 4 cột đầu dòng 1 và dòng 2
  sheet.mergeCells(1, 1, 2, 1);
  sheet.mergeCells(1, 2, 2, 2);
  sheet.mergeCells(1, 3, 2, 3);
  sheet.mergeCells(1, 4, 2, 4);

  // 2. Header Dòng 2
  const row2 = sheet.getRow(2);
  row2.height = 26;
  for (let dIdx = 0; dIdx < 6; dIdx++) {
    const colSubject = 5 + dIdx * 2;
    const colTeacher = colSubject + 1;
    row2.getCell(colSubject).value = 'Môn học';
    row2.getCell(colTeacher).value = 'Giáo viên';
  }

  // Định dạng style cho toàn bộ 2 dòng Header
  for (let r = 1; r <= 2; r++) {
    const rObj = sheet.getRow(r);
    for (let c = 1; c <= 16; c++) {
      const cell = rObj.getCell(c);
      cell.font = { name: 'Times New Roman', size: 11, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = thinBorder;
    }
  }

  // 3. Dữ liệu các lớp (Row 3 trở đi)
  let currentRow = 3;

  classesList.forEach((classId) => {
    // Cấu hình các buổi: SANG (tiết 1..5), TRUA (tiết 1), CHIEU (tiết 1..5 tương ứng periods 6..10)
    const sessions = [
      { name: 'SANG', periods: [1, 2, 3, 4, 5], actualPeriods: [1, 2, 3, 4, 5] },
      { name: 'TRUA', periods: [1], actualPeriods: [0] },
      { name: 'CHIEU', periods: [1, 2, 3, 4, 5], actualPeriods: [6, 7, 8, 9, 10] }
    ];

    sessions.forEach(session => {
      session.periods.forEach((displayPeriod, pIdx) => {
        const actualPeriod = session.actualPeriods[pIdx];
        const row = sheet.getRow(currentRow);
        row.height = 36;

        // Cột A: #
        row.getCell(1).value = '';
        // Cột B: Lớp
        row.getCell(2).value = classId;
        // Cột C: Mã buổi học
        row.getCell(3).value = session.name;
        // Cột D: Tiết học
        row.getCell(4).value = displayPeriod;

        // Điền dữ liệu các Thứ (2 đến 7)
        DAYS.forEach((day, dIdx) => {
          const colSubject = 5 + dIdx * 2;
          const colTeacher = colSubject + 1;

          const item = schedule.find(
            s => s.classId === classId && s.day === day && s.period === actualPeriod
          );

          if (item) {
            const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;
            let subjectCellVal = subjectDisplayName;
            row.getCell(colSubject).value = subjectCellVal;
            row.getCell(colSubject).font = { name: 'Times New Roman', size: 10, bold: true };

            const teacherId = String(item.teacherId || '').trim();
            const teacherName = teacherMap.get(teacherId) || teacherId;
            
            let teacherDisplay = teacherName;
            if (teacherId && teacherName && teacherName !== teacherId) {
              teacherDisplay = `${teacherName} (${teacherId})`;
            } else if (teacherId) {
              teacherDisplay = teacherId;
            }

            row.getCell(colTeacher).value = teacherDisplay;
            row.getCell(colTeacher).font = { name: 'Times New Roman', size: 10 };
          } else {
            row.getCell(colSubject).value = '';
            row.getCell(colTeacher).value = '';
          }

          row.getCell(colSubject).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          row.getCell(colSubject).border = thinBorder;
          row.getCell(colTeacher).alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
          row.getCell(colTeacher).border = thinBorder;
        });

        for (let c = 1; c <= 4; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Times New Roman', size: 10, bold: c === 2 || c === 3 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
        }

        currentRow++;
      });
    });

    const lastRowOfClass = sheet.getRow(currentRow - 1);
    for (let c = 1; c <= 16; c++) {
      lastRowOfClass.getCell(c).border = {
        ...thinBorder,
        bottom: { style: 'medium' }
      };
    }
  });

  // Thiết lập độ rộng cột chuẩn và đẹp mắt
  sheet.getColumn(1).width = 5;   // #
  sheet.getColumn(2).width = 8;   // Lớp
  sheet.getColumn(3).width = 12;  // Mã buổi học
  sheet.getColumn(4).width = 9;   // Tiết học
  for (let d = 0; d < 6; d++) {
    sheet.getColumn(5 + d * 2).width = 16;     // Môn học
    sheet.getColumn(5 + d * 2 + 1).width = 30; // Giáo viên: Tên GV (Mã GV) không xuống dòng
  }
};


const drawNewSchoolWideTimetable = (
  sheet: ExcelJS.Worksheet,
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  subjectsList: any[] = [],
  config: any = {}
) => {
  sheet.pageSetup = {
    paperSize: 8 as any, // A3
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
  };

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
  reportCell.value = config.timetableName ? `Số ${config.timetableName}` : '';
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

  sheet.addRow(['THỨ', 'TIẾT']);
  let colIdx = 3;
  classesList.forEach(c => {
    sheet.getCell(tableStartRow, colIdx).value = c;
    sheet.mergeCells(tableStartRow, colIdx, tableStartRow, colIdx + 1);
    colIdx += 2;
  });

  sheet.addRow(['', '']);
  sheet.mergeCells(`A${tableStartRow}:A${tableStartRow + 1}`);
  sheet.mergeCells(`B${tableStartRow}:B${tableStartRow + 1}`);
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

  let currentRow = tableStartRow + 2;
  days.forEach(day => {
    const startDayRow = currentRow;
    periods.forEach((p, pIndex) => {
      const rowData = [pIndex === 0 ? `Thứ ${day}` : '', p];
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
              { font: { bold: true, name: 'Times New Roman', size: 10 }, text: subjectDisplayName + '\n' },
              { font: { italic: true, name: 'Times New Roman', size: 10, color: { argb: 'FF2563EB' } }, text: teacherName }
            ];
            if (item.roomId) {
              richText.push({ font: { name: 'Times New Roman', size: 10, color: { argb: 'FF059669' } }, text: '\n' + item.roomId });
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

export const exportTimetableToExcel = async (
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
    const stored = getUserItem('config');
    if (stored) config = JSON.parse(stored);
  } catch(e) {}


  // 1. Sheet TKB Toàn trường (Sheet CHÍNH theo chuẩn mẫu)
  if (classesList.length > 0) {
    const newSchoolSheet = workbook.addWorksheet('TKB Toàn trường', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    drawNewSchoolWideTimetable(newSchoolSheet, schedule, classesList, teachersList, subjectsList, config);
    
    const schoolSheet = workbook.addWorksheet('TKB Toàn trường CSDL', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    drawSchoolWideTimetable(schoolSheet, schedule, classesList, teachersList, subjectsList);
  }

  // 2. Sheet TKB Lớp
  if (classesList.length > 0) {
    const classSheet = workbook.addWorksheet('TKB Lớp', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    setupSheet(classSheet);
    
    let currentRow = 1;
    classesList.forEach((classId, index) => {
      const classSchedule = schedule.filter(s => s.classId === classId);
      currentRow = drawTimetable(classSheet, classId, currentRow, classSchedule, 'Lớp', config);
      
      if (index < classesList.length - 1) {
        classSheet.getRow(currentRow - 2).addPageBreak();
      }
    });
  }

  // 3. Sheet TKB Giáo viên
  if (teachersList.length > 0) {
    const teacherSheet = workbook.addWorksheet('TKB Giáo viên', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });
    setupSheet(teacherSheet);
    
    let currentRow = 1;
    teachersList.forEach((teacher, index) => {
      const teacherId = teacher['Mã GV (*)'];
      const teacherName = teacher['Họ và tên (*)'] || teacherId;
      const teacherSchedule = schedule.filter(s => s.teacherId === teacherId);
      currentRow = drawTimetable(teacherSheet, teacherName, currentRow, teacherSchedule, 'Giáo viên', config);
      
      if (index < teachersList.length - 1) {
        teacherSheet.getRow(currentRow - 2).addPageBreak();
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `ThoiKhoaBieu_ToanTruong_${new Date().getTime()}.xlsx`);
};
