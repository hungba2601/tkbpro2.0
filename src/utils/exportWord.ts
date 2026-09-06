import { saveAs } from 'file-saver';
import type { ScheduleItem } from './scheduler';

export const exportTimetableToWord = (
  schedule: ScheduleItem[],
  classesList: string[],
  teachersList: any[],
  exportType: 'Lớp' | 'Giáo viên' | 'Tất cả' = 'Tất cả'
) => {
  const DAYS = [2, 3, 4, 5, 6, 7];
  const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Thời Khóa Biểu</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid black; padding: 5px; text-align: center; vertical-align: middle; }
        th { background-color: #d9d9d9; font-weight: bold; }
        .title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 10px; }
        .period-col { width: 80px; background-color: #f2f2f2; font-weight: bold; }
        .subject { font-weight: bold; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
  `;

  const generateTableHtml = (title: string, items: ScheduleItem[], viewMode: 'Lớp' | 'Giáo viên') => {
    let tableHtml = `<div class="title">THỜI KHÓA BIỂU ${viewMode.toUpperCase()}: ${title}</div>`;
    tableHtml += `<table>`;
    
    // Header
    tableHtml += `<tr><th class="period-col">Tiết \\ Thứ</th>`;
    DAYS.forEach(d => { tableHtml += `<th>Thứ ${d}</th>`; });
    tableHtml += `</tr>`;

    // Rows
    PERIODS.forEach(p => {
      const isAfternoon = p > 5;
      const displayPeriod = isAfternoon ? p - 5 : p;
      tableHtml += `<tr>`;
      tableHtml += `<td class="period-col">Tiết ${displayPeriod}<br>(${isAfternoon ? 'Chiều' : 'Sáng'})</td>`;
      
      DAYS.forEach(d => {
        const item = items.find(i => i.day === d && i.period === p);
        tableHtml += `<td>`;
        if (item) {
          const line1 = item.subjectId;
          const line2 = viewMode === 'Lớp' ? item.teacherId : item.classId;
          tableHtml += `<span class="subject">${line1}</span><br><span>${line2}</span>`;
          if (item.roomId) {
            tableHtml += `<br><span style="color: #0ea5e9; font-weight: bold;">${item.roomId}</span>`;
          }
        } else {
          tableHtml += `-`;
        }
        tableHtml += `</td>`;
      });
      tableHtml += `</tr>`;
    });

    tableHtml += `</table>`;
    return tableHtml;
  };

  // 1. In TKB Lớp
  if (exportType === 'Lớp' || exportType === 'Tất cả') {
    classesList.forEach((classId, index) => {
      const classSchedule = schedule.filter(s => s.classId === classId);
      html += generateTableHtml(classId, classSchedule, 'Lớp');
      const hasMore = index < classesList.length - 1 || (exportType === 'Tất cả' && teachersList.length > 0);
      if (hasMore) {
        html += `<div class="page-break"><br style="page-break-before: always; clear: both" /></div>`;
      }
    });
  }

  // 2. In TKB Giáo viên
  if (exportType === 'Giáo viên' || exportType === 'Tất cả') {
    teachersList.forEach((teacher, index) => {
      const teacherId = teacher['Mã GV (*)'];
      const teacherName = teacher['Họ và tên (*)'] || teacherId;
      const teacherSchedule = schedule.filter(s => s.teacherId === teacherId);
      html += generateTableHtml(teacherName, teacherSchedule, 'Giáo viên');
      if (index < teachersList.length - 1) {
        html += `<div class="page-break"><br style="page-break-before: always; clear: both" /></div>`;
      }
    });
  }

  html += `</body></html>`;

  // Tạo file Word (.doc) bằng kỹ thuật Blob HTML
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
  
  const fileName = exportType === 'Tất cả' 
    ? `ThoiKhoaBieu_ToanTruong_${new Date().getTime()}.doc`
    : `ThoiKhoaBieu_${exportType === 'Lớp' ? 'Lop' : 'GiaoVien'}_${new Date().getTime()}.doc`;
    
  saveAs(blob, fileName);
};
