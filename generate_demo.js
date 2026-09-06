import fs from 'fs';
import * as xlsx from 'xlsx';

const classesData = [];
const subjectsData = [
  {'Mã Môn (*)': 'TOAN', 'Tên Môn (*)': 'Toán học', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
  {'Mã Môn (*)': 'VAN', 'Tên Môn (*)': 'Ngữ văn', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
  {'Mã Môn (*)': 'ANH', 'Tên Môn (*)': 'Tiếng Anh', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
  {'Mã Môn (*)': 'KHTN', 'Tên Môn (*)': 'Khoa học tự nhiên', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
  {'Mã Môn (*)': 'LSU_DIA', 'Tên Môn (*)': 'Lịch sử và Địa lý', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
  {'Mã Môn (*)': 'GDTC', 'Tên Môn (*)': 'Giáo dục thể chất', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'NGHETHUAT', 'Tên Môn (*)': 'Nghệ thuật', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'TIN', 'Tên Môn (*)': 'Tin học', 'Yêu cầu phòng đặc biệt': 'PHONG_MAY', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'GDCD', 'Tên Môn (*)': 'Giáo dục công dân', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 1, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'GDDP', 'Tên Môn (*)': 'Giáo dục địa phương', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 1, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'HDTN', 'Tên Môn (*)': 'Hoạt động trải nghiệm', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Không'},
  {'Mã Môn (*)': 'CN', 'Tên Môn (*)': 'Công nghệ', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 1, 'Độ khó / Yêu cầu giãn cách': 'Không'}
];

const periodsMap = {
  'TOAN': 4, 'VAN': 4, 'ANH': 3, 'KHTN': 4, 'LSU_DIA': 3,
  'GDTC': 2, 'NGHETHUAT': 2, 'TIN': 1, 'GDCD': 1, 'GDDP': 1, 'HDTN': 3, 'CN': 1
};

// Khối 6, 7 học Sáng
for (let i = 1; i <= 13; i++) classesData.push({'Mã Lớp (*)': `6A${i}`, 'Khối (*)': 6, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '1,2,3,4,5', 'Tiết học Chiều (*)': ''});
for (let i = 1; i <= 12; i++) classesData.push({'Mã Lớp (*)': `7A${i}`, 'Khối (*)': 7, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '1,2,3,4,5', 'Tiết học Chiều (*)': ''});

// Khối 8, 9 học Chiều
for (let i = 1; i <= 14; i++) classesData.push({'Mã Lớp (*)': `8A${i}`, 'Khối (*)': 8, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '', 'Tiết học Chiều (*)': '1,2,3,4,5'});
for (let i = 1; i <= 13; i++) classesData.push({'Mã Lớp (*)': `9A${i}`, 'Khối (*)': 9, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '', 'Tiết học Chiều (*)': '1,2,3,4,5'});

const teachersData = [];
const assignmentsData = [];

// Phân công GV. Mỗi GV dạy tối đa khoảng 16-18 tiết (~ 4-6 lớp)
let gvIndex = 1;
for (const sub of subjectsData) {
  const maMon = sub['Mã Môn (*)'];
  const soTiet = periodsMap[maMon];
  
  let currentClassesForTeacher = [];
  let currentPeriods = 0;
  let currentTeacher = `GV_${gvIndex.toString().padStart(3, '0')}`;
  
  teachersData.push({'Mã GV (*)': currentTeacher, 'Họ và tên (*)': `Giáo viên ${maMon} ${gvIndex}`, 'Tổ chuyên môn': maMon, 'Ràng buộc thời gian (Nghỉ cố định)': '', 'Số tiết định mức tối đa/ngày': 4});
  gvIndex++;

  for (const c of classesData) {
    currentClassesForTeacher.push(c['Mã Lớp (*)']);
    currentPeriods += soTiet;

    if (currentPeriods >= 15 || c === classesData[classesData.length - 1]) {
      assignmentsData.push({
        'Mã GV (*)': currentTeacher,
        'Tên GV': `Giáo viên ${maMon} ${gvIndex - 1}`,
        'Mã Môn (*)': maMon,
        'Lớp (*)': currentClassesForTeacher.join(', '),
        'Số tiết/tuần (*)': soTiet
      });
      
      if (c !== classesData[classesData.length - 1]) {
        currentClassesForTeacher = [];
        currentPeriods = 0;
        currentTeacher = `GV_${gvIndex.toString().padStart(3, '0')}`;
        teachersData.push({'Mã GV (*)': currentTeacher, 'Họ và tên (*)': `Giáo viên ${maMon} ${gvIndex}`, 'Tổ chuyên môn': maMon, 'Ràng buộc thời gian (Nghỉ cố định)': '', 'Số tiết định mức tối đa/ngày': 4});
        gvIndex++;
      }
    }
  }
}

const constraintsData = [
  {'Đối tượng': 'Tất cả các lớp', 'Thứ (*)': 2, 'Tiết (*)': '1,6', 'Nội dung ghim / Cấm': 'Chào cờ', 'Quy tắc (*)': 'Cứng'},
  {'Đối tượng': 'Tất cả các lớp', 'Thứ (*)': 7, 'Tiết (*)': '5,10', 'Nội dung ghim / Cấm': 'Sinh hoạt lớp', 'Quy tắc (*)': 'Cứng'}
];

const wb = xlsx.utils.book_new();

const wsClasses = xlsx.utils.json_to_sheet(classesData);
xlsx.utils.book_append_sheet(wb, wsClasses, 'Lớp học');

const wsSubjects = xlsx.utils.json_to_sheet(subjectsData);
xlsx.utils.book_append_sheet(wb, wsSubjects, 'Môn học');

const wsTeachers = xlsx.utils.json_to_sheet(teachersData);
xlsx.utils.book_append_sheet(wb, wsTeachers, 'Giáo viên');

const wsAssignments = xlsx.utils.json_to_sheet(assignmentsData);
xlsx.utils.book_append_sheet(wb, wsAssignments, 'Phân công');

const wsConstraints = xlsx.utils.json_to_sheet(constraintsData);
xlsx.utils.book_append_sheet(wb, wsConstraints, 'Ràng buộc');

xlsx.writeFile(wb, '../Demo_TKB_52Lop.xlsx');
console.log('Successfully generated ../Demo_TKB_52Lop.xlsx');
