import type { ScheduleItem } from './scheduler';

// Types for internal processing
interface Lesson {
  id: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  size: number;
  isHard: boolean;
  teacherWorkload?: number;
}

interface WorkerMessage {
  type: 'START';
  payload: {
    classes: any[];
    subjects: any[];
    teachers: any[];
    assignments: any[];
    constraints: any[];
    rooms?: any[];
    oldSchedule?: ScheduleItem[] | null;
  };
}

// Lắng nghe message từ Main Thread
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'START') {
    const { classes, subjects, teachers, assignments, constraints, rooms, oldSchedule } = e.data.payload;
    
    try {
      const result = runAIAlgorithm(classes, subjects, teachers, assignments, constraints, rooms, oldSchedule);
      self.postMessage({ type: 'SUCCESS', payload: result });
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      self.postMessage({ type: 'ERROR', payload: msg });
    }
  }
};

function runAIAlgorithm(
  classes: any[],
  subjects: any[],
  teachers: any[],
  assignments: any[],
  constraints: any[],
  rooms: any[] = [],
  oldSchedule?: ScheduleItem[] | null
): ScheduleItem[] {
  const oldScheduleMap = new Map<string, Array<{day: number, period: number, roomId?: string}>>();
  if (oldSchedule && Array.isArray(oldSchedule)) {
    oldSchedule.forEach(s => {
      const key = `${s.classId}_${s.teacherId}_${s.subjectId}`;
      if (!oldScheduleMap.has(key)) oldScheduleMap.set(key, []);
      oldScheduleMap.get(key)!.push({ day: s.day, period: s.period, roomId: s.roomId });
    });
  }

  // Helper to safely get value from object ignoring key spaces/case/symbols
  const getVal = (obj: any, expectedKey: string) => {
    if (!obj) return undefined;
    const norm = (s: string) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
    const normExpected = norm(expectedKey);
    const actualKey = Object.keys(obj).find(k => norm(k) === normExpected);
    return actualKey ? obj[actualKey] : undefined;
  };

  const normalizeStr = (str: string) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const normalizeRoomId = (str: string) => String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[\s_\-]/g, '');

  // Hàm chuẩn hóa loại phòng bộ môn / phòng đặc biệt chính xác (không bắt nhầm từ con)
  const getCanonicalRoomType = (str: string): string => {
    if (!str) return '';
    const norm = String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    
    // Môn Tin học / Phòng Tin
    if (
      norm === 'tin' || 
      norm === 'tinhoc' || 
      norm.startsWith('tin ') ||
      norm.startsWith('tin_') ||
      norm.startsWith('tinhoc') ||
      norm.startsWith('phong tin') ||
      norm.startsWith('phong_tin') ||
      norm.startsWith('phongtin') ||
      norm.includes('may tinh') ||
      norm.includes('maytinh') ||
      norm === 'it' ||
      norm === 'computer'
    ) {
      return 'PHONG_TIN';
    }

    // Phòng Vật lý / Thực hành Lý (Tránh nhầm Lịch sử và Địa lý)
    if (
      norm === 'vat ly' ||
      norm === 'vatly' ||
      norm === 'ly' ||
      norm.startsWith('vat ly') ||
      norm.startsWith('phong ly') ||
      norm.startsWith('phong_ly') ||
      norm.startsWith('phongly') ||
      norm === 'physics'
    ) {
      return 'PHONG_TH_LY';
    }

    // Phòng Hóa học (Tránh nhầm Khoa học tự nhiên)
    if (
      norm === 'hoa hoc' ||
      norm === 'hoahoc' ||
      norm === 'hoa' ||
      norm.startsWith('hoa hoc') ||
      norm.startsWith('phong hoa') ||
      norm.startsWith('phong_hoa') ||
      norm.startsWith('phonghoa') ||
      norm === 'chemistry' ||
      norm === 'chem'
    ) {
      return 'PHONG_TH_HOA';
    }

    // Phòng Sinh học (Tránh nhầm Sinh hoạt lớp / Hoạt động trải nghiệm)
    if (
      norm === 'sinh hoc' ||
      norm === 'sinhhoc' ||
      norm === 'sinh' ||
      norm.startsWith('sinh hoc') ||
      norm.startsWith('phong sinh') ||
      norm.startsWith('phong_sinh') ||
      norm.startsWith('phongsinh') ||
      norm === 'biology'
    ) {
      return 'PHONG_TH_SINH';
    }

    // Phòng KHTN / Lab
    if (
      norm === 'khtn' ||
      norm === 'khoa hoc tu nhien' ||
      norm.startsWith('khtn') ||
      norm.startsWith('phong khtn') ||
      norm.startsWith('phong_khtn') ||
      norm.startsWith('phong thuc hanh') ||
      norm === 'lab'
    ) {
      return 'PHONG_TH_KHTN';
    }

    // Phòng Ngoại ngữ / Lab Tiếng Anh
    if (
      norm === 'tieng anh' ||
      norm === 'tienganh' ||
      norm === 'ngoai ngu' ||
      norm === 'ngoaingu' ||
      norm.startsWith('tieng anh') ||
      norm.startsWith('ngoai ngu') ||
      norm.startsWith('phong tieng anh') ||
      norm.startsWith('phong ngoai ngu') ||
      norm.startsWith('phong_ngoai_ngu') ||
      norm.startsWith('phong lab') ||
      norm === 'english'
    ) {
      return 'PHONG_NGOAI_NGU';
    }

    // Phòng Âm nhạc
    if (
      norm === 'am nhac' ||
      norm === 'amnhac' ||
      norm.startsWith('am nhac') ||
      norm.startsWith('phong am nhac') ||
      norm.startsWith('phong_am_nhac') ||
      norm === 'music'
    ) {
      return 'PHONG_AM_NHAC';
    }

    // Phòng Mỹ thuật
    if (
      norm === 'my thuat' ||
      norm === 'mythuat' ||
      norm.startsWith('my thuat') ||
      norm.startsWith('phong my thuat') ||
      norm.startsWith('phong_my_thuat') ||
      norm === 'art'
    ) {
      return 'PHONG_MY_THUAT';
    }

    // Phòng Công nghệ
    if (
      norm === 'cong nghe' ||
      norm === 'congnghe' ||
      norm.startsWith('cong nghe') ||
      norm.startsWith('phong cong nghe') ||
      norm.startsWith('phong_cong_nghe') ||
      norm === 'tech'
    ) {
      return 'PHONG_CONG_NGHE';
    }

    // Phòng GDTC / Thể dục / Nhà đa năng / Sân thể chất
    if (
      norm === 'gdtc' ||
      norm === 'the duc' ||
      norm === 'theduc' ||
      norm === 'giao duc the chat' ||
      norm === 'giaoducthechat' ||
      norm === 'the chat' ||
      norm === 'thechat' ||
      norm.startsWith('gdtc') ||
      norm.startsWith('the duc') ||
      norm.startsWith('giao duc the chat') ||
      norm.startsWith('phong gdtc') ||
      norm.startsWith('phong_gdtc') ||
      norm.startsWith('nha da nang') ||
      norm.startsWith('nha_da_nang') ||
      norm.startsWith('phong da nang') ||
      norm.startsWith('san the duc') ||
      norm.startsWith('san the chat') ||
      norm.startsWith('san bong') ||
      norm === 'gym' ||
      norm === 'sport'
    ) {
      return 'PHONG_GDTC';
    }

    return norm.replace(/[\s_\-]/g, '');
  };

  // 1. Chuẩn bị dữ liệu (Data Preparation)
  // Xây dựng danh mục ánh xạ Giáo viên & Môn học toàn diện 2 chiều
  const teacherIdToNameMap = new Map<string, string>();
  const teacherNameToIdMap = new Map<string, string>();
  const subjectIdToNameMap = new Map<string, string>();

  teachers.forEach(t => {
    const id = String(getVal(t, 'Mã GV (*)') || getVal(t, 'Mã GV') || getVal(t, 'Mã giáo viên') || getVal(t, 'MaGV') || getVal(t, 'ID') || '').trim();
    const name = String(getVal(t, 'Họ và tên (*)') || getVal(t, 'Họ và tên') || getVal(t, 'Tên GV (*)') || getVal(t, 'Tên GV') || getVal(t, 'Tên') || getVal(t, 'Họ tên') || id).trim();
    if (id) {
      teacherIdToNameMap.set(id, name || id);
      teacherIdToNameMap.set(normalizeStr(id), name || id);
    }
    if (name) {
      teacherNameToIdMap.set(normalizeStr(name), id || name);
    }
  });

  assignments.forEach(a => {
    const id = String(getVal(a, 'Mã GV (*)') || getVal(a, 'Mã GV') || '').trim();
    const name = String(getVal(a, 'Tên GV') || getVal(a, 'Tên GV (*)') || getVal(a, 'Họ và tên') || '').trim();
    if (id && name) {
      if (!teacherIdToNameMap.has(id)) teacherIdToNameMap.set(id, name);
      if (!teacherNameToIdMap.has(normalizeStr(name))) teacherNameToIdMap.set(normalizeStr(name), id);
    }
  });

  subjects.forEach(s => {
    const id = String(getVal(s, 'Mã Môn (*)') || getVal(s, 'Mã Môn') || '').trim();
    const name = String(getVal(s, 'Tên Môn (*)') || getVal(s, 'Tên Môn') || '').trim();
    if (id) {
      subjectIdToNameMap.set(id, name || id);
      subjectIdToNameMap.set(normalizeStr(id), name || id);
    }
  });

  // classId -> Map of (day -> array of allowed periods)
  const classConfigMap = new Map<string, Map<number, number[]>>();
  const classNameToIdMap = new Map<string, string>();
  const subjectMaxConsecutive = new Map<string, number>();
  const subjectIsHard = new Map<string, boolean>();
  const subjectReqRoom = new Map<string, string>(); // Môn -> Mã Loại Phòng

  interface RoomInfo {
    roomId: string;
    roomName: string;
    fixedTeacherId: string;
  }
  const roomsByType = new Map<string, RoomInfo[]>(); // Mã Loại -> Danh sách phòng

  if (rooms && rooms.length > 0) {
    for (const r of rooms) {
      const typeIdRaw = String(getVal(r, 'Mã Loại Phòng (*)') || getVal(r, 'Mã Loại Phòng') || getVal(r, 'Mã Phòng (*)') || getVal(r, 'Mã Phòng') || getVal(r, 'Loại Phòng') || getVal(r, 'Tên Phòng (*)') || '').trim();
      const rId = String(getVal(r, 'Mã Phòng Cụ Thể (*)') || getVal(r, 'Mã Phòng Cụ Thể') || getVal(r, 'Mã Phòng (*)') || getVal(r, 'Mã Phòng') || getVal(r, 'Tên Phòng (*)') || typeIdRaw).trim();
      const rName = String(getVal(r, 'Tên Phòng (*)') || getVal(r, 'Tên Phòng') || rId).trim();
      
      const fixedTeacherRaw = String(getVal(r, 'GV Cố định') || getVal(r, 'Giáo viên cố định') || getVal(r, 'GV cố định') || getVal(r, 'GV Phụ trách') || '').trim();
      let fixedTeacherId = '';
      if (fixedTeacherRaw && !fixedTeacherRaw.startsWith('--')) {
          // Trích xuất mã số nếu chuỗi có dạng "Nguyễn Phi Hùng (7913698240)"
          const idMatch = fixedTeacherRaw.match(/\d{4,}/);
          if (idMatch) {
             fixedTeacherId = normalizeStr(idMatch[0]);
          } else {
             const rawNorm = normalizeStr(fixedTeacherRaw);
             if (teacherNameToIdMap.has(rawNorm)) {
                fixedTeacherId = normalizeStr(teacherNameToIdMap.get(rawNorm)!);
             } else if (teacherIdToNameMap.has(rawNorm)) {
                fixedTeacherId = rawNorm;
             } else {
                for (const [nameNorm, id] of teacherNameToIdMap.entries()) {
                  if (rawNorm === nameNorm || rawNorm.includes(nameNorm) || nameNorm.includes(rawNorm)) {
                    fixedTeacherId = normalizeStr(id);
                    break;
                  }
                }
                if (!fixedTeacherId) fixedTeacherId = rawNorm;
             }
          }
      }
      
      const rQtyStr = getVal(r, 'Số lượng (*)') || getVal(r, 'Số lượng') || getVal(r, 'SL');
      const rQty = parseInt(rQtyStr, 10);
      
      const canonicalType = getCanonicalRoomType(typeIdRaw) || getCanonicalRoomType(rName) || normalizeRoomId(typeIdRaw);
      const typesToRegister = Array.from(new Set([canonicalType, normalizeRoomId(typeIdRaw), normalizeStr(typeIdRaw)])).filter(Boolean);

      for (const tKey of typesToRegister) {
        if (!roomsByType.has(tKey)) {
          roomsByType.set(tKey, []);
        }
        const roomList = roomsByType.get(tKey)!;
        
        if (!isNaN(rQty) && rQty > 1 && !getVal(r, 'Mã Phòng Cụ Thể (*)')) {
           for (let i = 1; i <= rQty; i++) {
              roomList.push({
                 roomId: `${rId}_${i}`,
                 roomName: rName ? `${rName} ${i}` : `${rId} ${i}`,
                 fixedTeacherId: ''
              });
           }
        } else {
           roomList.push({
              roomId: rId,
              roomName: rName,
              fixedTeacherId: fixedTeacherId
           });
        }
      }
    }
  }

  // Đảm bảo luôn có danh sách phòng Tin học và gán đúng các thầy cô chuyên trách
  if (!roomsByType.has('PHONG_TIN') || roomsByType.get('PHONG_TIN')!.length === 0) {
    const defaultTinRooms: RoomInfo[] = [
      { roomId: 'TIN_1', roomName: 'Phòng tin 1', fixedTeacherId: '7913698240' },
      { roomId: 'TIN_2', roomName: 'Phòng tin 2', fixedTeacherId: '7904801482' },
      { roomId: 'TIN_3', roomName: 'Phòng tin 3', fixedTeacherId: '7900570373' }
    ];
    roomsByType.set('PHONG_TIN', defaultTinRooms);
    roomsByType.set('phongtin', defaultTinRooms);
    roomsByType.set('phong_tin', defaultTinRooms);
    roomsByType.set('tin', defaultTinRooms);
    roomsByType.set('tinhoc', defaultTinRooms);
  }

  // Parse Classes
  classes.forEach(c => {
    const classId = String(getVal(c, 'Mã Lớp (*)') || getVal(c, 'Mã Lớp') || '').trim();
    const className = String(getVal(c, 'Tên Lớp (*)') || getVal(c, 'Tên Lớp') || '').trim();
    const daysRaw = String(getVal(c, 'Ngày học (*)') || getVal(c, 'Ngày học') || '2,3,4,5,6,7');
    const morningRaw = String(getVal(c, 'Tiết học Sáng (*)') || getVal(c, 'Tiết học Sáng') || getVal(c, 'Sáng') || '');
    const afternoonRaw = String(getVal(c, 'Tiết học Chiều (*)') || getVal(c, 'Tiết học Chiều') || getVal(c, 'Chiều') || '');
    const sessionRaw = String(getVal(c, 'Buổi học (*)') || getVal(c, 'Buổi học') || getVal(c, 'Buổi') || '').trim().toLowerCase();
    
    if (classId) {
      // Dùng Regex /[,;\.\s]+/ để cho phép phân tách bằng dấu phẩy, chấm phẩy, chấm, hoặc khoảng trắng
      const days = daysRaw.split(/[,;\.\s]+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 2 && d <= 7);
      
      // Tiết sáng (1..5)
      const morningPeriods = morningRaw.split(/[,;\.\s]+/).map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p >= 1 && p <= 5);
      
      // Tiết chiều: Cho phép người dùng nhập 1,2,3,4,5 HOẶC 6,7,8,9,10. Tự động quy đổi 1..5 thành 6..10
      const rawAfternoonList = afternoonRaw.split(/[,;\.\s]+/).map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      const afternoonPeriods = rawAfternoonList.map(p => {
        if (p >= 1 && p <= 5) return p + 5; // Nhập 1..5 cho chiều -> ánh xạ thành 6..10
        if (p >= 6 && p <= 10) return p;   // Nhập 6..10 -> giữ nguyên
        return null;
      }).filter((p): p is number => p !== null);

      // Fallback nếu người dùng chỉ điền cột Buổi học (*) = "Sáng" / "Chiều" / "Cả ngày"
      if (morningPeriods.length === 0 && afternoonPeriods.length === 0 && sessionRaw) {
        if (sessionRaw.includes('sang') || sessionRaw.includes('sáng')) {
          morningPeriods.push(1, 2, 3, 4, 5);
        } else if (sessionRaw.includes('chieu') || sessionRaw.includes('chiều')) {
          afternoonPeriods.push(6, 7, 8, 9, 10);
        } else if (sessionRaw.includes('ca ngay') || sessionRaw.includes('cả ngày') || sessionRaw.includes('2 buoi') || sessionRaw.includes('hai buoi')) {
          morningPeriods.push(1, 2, 3, 4, 5);
          afternoonPeriods.push(6, 7, 8, 9, 10);
        }
      }

      // Fallback nếu không điền tiết lẫn buổi: Dựa vào khối lớp (Khối 8, 9 mặc định chiều, Khối 6, 7 mặc định sáng)
      if (morningPeriods.length === 0 && afternoonPeriods.length === 0) {
        const gradeVal = parseInt(getVal(c, 'Khối (*)')) || parseInt(getVal(c, 'Khối')) || (classId.match(/\d+/)?.[0] ? parseInt(classId.match(/\d+/)![0]) : 0);
        if (gradeVal === 8 || gradeVal === 9) {
          afternoonPeriods.push(6, 7, 8, 9, 10);
        } else {
          morningPeriods.push(1, 2, 3, 4, 5);
        }
      }
      
      const allowedPeriods = [...morningPeriods, ...afternoonPeriods].sort((a,b) => a-b);
      const targetDays = days.length > 0 ? days : [2,3,4,5,6,7];
      
      if (!classConfigMap.has(classId)) {
        classConfigMap.set(classId, new Map<number, number[]>());
      }
      const dayMap = classConfigMap.get(classId)!;
      
      targetDays.forEach(d => {
         // Merge if already exists (hỗ trợ nhập nhiều dòng cho cùng 1 lớp)
         const existing = dayMap.get(d) || [];
         const merged = Array.from(new Set([...existing, ...allowedPeriods])).sort((a,b) => a-b);
         dayMap.set(d, merged);
      });

      if (className) classNameToIdMap.set(className.toLowerCase(), classId);
    }
  });

  // Xác định các lớp học 2 buổi
  const twoSessionClasses = new Set<string>();
  for (const [classId, dayMap] of classConfigMap.entries()) {
    let hasMorning = false;
    let hasAfternoon = false;
    for (const periods of dayMap.values()) {
      if (periods.some(p => p <= 5)) hasMorning = true;
      if (periods.some(p => p >= 6)) hasAfternoon = true;
    }
    if (hasMorning && hasAfternoon) {
      twoSessionClasses.add(classId);
    }
  }

  // Parse Subjects
  subjects.forEach(s => {
    const subId = String(getVal(s, 'Mã Môn (*)') || getVal(s, 'Mã Môn') || '').trim();
    const subName = String(getVal(s, 'Tên Môn (*)') || getVal(s, 'Tên Môn') || '').trim();
    const maxConsecutive = parseInt(getVal(s, 'Số tiết kép tối đa')) || 2; // Default 2
    const isHard = String(getVal(s, 'Độ khó / Yêu cầu giãn cách') || '').trim().toLowerCase() === 'có';
    const reqRoomRaw = String(getVal(s, 'Yêu cầu phòng đặc biệt') || getVal(s, 'Yêu cầu phòng') || getVal(s, 'Phòng đặc biệt') || getVal(s, 'Phòng bộ môn') || getVal(s, 'Mã Loại Phòng') || '').trim();
    
    let canonicalReqRoom = getCanonicalRoomType(reqRoomRaw);
    if (!canonicalReqRoom && reqRoomRaw) {
      canonicalReqRoom = normalizeRoomId(reqRoomRaw);
    }
    
    // Tự động suy luận phòng nếu là môn Tin học, KHTN, Lý, Hóa... mà chưa điền
    if (!canonicalReqRoom) {
      const autoRoom = getCanonicalRoomType(subId) || getCanonicalRoomType(subName);
      if (roomsByType.has(autoRoom)) {
        canonicalReqRoom = autoRoom;
      }
    }

    if (subId) {
      subjectMaxConsecutive.set(subId, maxConsecutive);
      subjectIsHard.set(subId, isHard);
      if (canonicalReqRoom) {
        subjectReqRoom.set(subId, canonicalReqRoom);
        subjectReqRoom.set(normalizeStr(subId), canonicalReqRoom);
      }
    }
    if (subName && canonicalReqRoom) {
      subjectReqRoom.set(subName, canonicalReqRoom);
      subjectReqRoom.set(normalizeStr(subName), canonicalReqRoom);
    }
  });

  // Khởi tạo bảng thời gian phong tỏa (Hard Constraints)
  const initialClassBlocks = new Map<string, Set<string>>();
  const initialTeacherBlocks = new Map<string, Set<string>>();
  const preAssignedSchedules: ScheduleItem[] = [];

  classes.forEach(c => { 
    const classId = String(getVal(c, 'Mã Lớp (*)') || '').trim();
    if (classId) initialClassBlocks.set(classId, new Set()); 
  });
  
  teachers.forEach(t => { 
    const teacherIdRaw = String(getVal(t, 'Mã GV (*)') || '').trim();
    if (teacherIdRaw) {
      const teacherId = teacherIdRaw;
      const blockSet = new Set<string>();
      initialTeacherBlocks.set(teacherId, blockSet);

      // Xử lý cột Ràng buộc thời gian (Nghỉ cố định)
      const offTimes = String(getVal(t, 'Ràng buộc thời gian (Nghỉ cố định)') || '').trim();
      if (offTimes) {
        const rules = offTimes.split(/[,;]+/).map(r => r.trim().toUpperCase()).filter(Boolean);
        rules.forEach(rule => {
          // 1. Cú pháp Tiết cụ thể có định danh Buổi (C hoặc S):
          // VD: C3.1, C3.2, C3:1, C3-1, S3.1, S3.2
          const matchPrefixSession = rule.match(/^([SC])([2-7])[.:\-_]?([1-5])$/);
          if (matchPrefixSession) {
            const session = matchPrefixSession[1]; // S hoặc C
            const day = parseInt(matchPrefixSession[2]);
            const p = parseInt(matchPrefixSession[3]);
            const actualPeriod = session === 'C' ? p + 5 : p;
            blockSet.add(`${day}-${actualPeriod}`);
            return;
          }

          // VD: 3.C1, 3.C2, 3:C1, 3-C1, 3C1, 3.S1, 3.S2
          const matchSuffixSession = rule.match(/^([2-7])[.:\-_]?([SC])([1-5])$/);
          if (matchSuffixSession) {
            const day = parseInt(matchSuffixSession[1]);
            const session = matchSuffixSession[2]; // S hoặc C
            const p = parseInt(matchSuffixSession[3]);
            const actualPeriod = session === 'C' ? p + 5 : p;
            blockSet.add(`${day}-${actualPeriod}`);
            return;
          }

          // 2. Cú pháp Thứ.Tiết thuần số (VD: 3.1, 3.2 -> Tiết 1,2 sáng; 3.6, 3.7 -> Tiết 1,2 chiều)
          const matchNumeric = rule.match(/^([2-7])[.:\-_](\d+)$/);
          if (matchNumeric) {
            const day = parseInt(matchNumeric[1]);
            const p = parseInt(matchNumeric[2]);
            if (p >= 1 && p <= 10) {
              blockSet.add(`${day}-${p}`);
            }
            return;
          }

          // 3. Cú pháp nghỉ cả buổi hoặc cả ngày: S2, C3, T4...
          const matchFullSession = rule.match(/^([SCT])([2-7])$/);
          if (matchFullSession) {
            const type = matchFullSession[1];
            const day = parseInt(matchFullSession[2]);
            if (type === 'T') {
              // Cả ngày
              for (let p = 1; p <= 10; p++) blockSet.add(`${day}-${p}`);
            } else if (type === 'S') {
              // Sáng (tiết 1-5)
              for (let p = 1; p <= 5; p++) blockSet.add(`${day}-${p}`);
            } else if (type === 'C') {
              // Chiều (tiết 6-10)
              for (let p = 6; p <= 10; p++) blockSet.add(`${day}-${p}`);
            }
            return;
          }
        });
      }
    }
  });

  // Parse Constraints
  constraints.forEach(constraint => {
    let quyTac = String(getVal(constraint, 'Quy tắc (*)') || getVal(constraint, 'Quy tắc') || '').trim();
    if (!quyTac) quyTac = 'Cứng'; // Mặc định là Cứng nếu để trống
    
    if (quyTac === 'Cứng (Bắt buộc)' || quyTac === 'Cứng') {
      const target = String(getVal(constraint, 'Đối tượng') || '').trim();
      const dayRaw = getVal(constraint, 'Thứ (*)') || getVal(constraint, 'Thứ');
      const day = parseInt(dayRaw);

      const buoiRaw = String(getVal(constraint, 'Buổi (*)') || getVal(constraint, 'Buổi') || '').trim().toLowerCase();
      const isAfternoon = buoiRaw.includes('chieu') || buoiRaw.includes('chiều');
      const isAllDay = buoiRaw.includes('ca ngay') || buoiRaw.includes('cả ngày') || buoiRaw.includes('toan ngay');

      const periodsRaw = String(getVal(constraint, 'Tiết (*)') || getVal(constraint, 'Tiết') || '').replace(/\./g, ',');
      
      // Hỗ trợ parse đa dạng: "1,2,3,4,5", "1-5", "C1, C2", "S1, S2", "6,7,8,9,10"
      const rawTokens = periodsRaw.split(/[,;\s]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
      const parsedPeriods: number[] = [];

      rawTokens.forEach(tok => {
        // Hỗ trợ dải dạng 1-5 hoặc C1-C5
        if (tok.includes('-')) {
          const parts = tok.split('-');
          const startTok = parts[0].trim();
          const endTok = parts[1].trim();
          const isCTok = startTok.startsWith('C') || endTok.startsWith('C');
          const startNum = parseInt(startTok.replace(/[CS]/g, ''));
          const endNum = parseInt(endTok.replace(/[CS]/g, ''));
          if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
            for (let i = startNum; i <= endNum; i++) {
              if (isCTok || isAfternoon) {
                parsedPeriods.push(i <= 5 ? i + 5 : i);
              } else if (isAllDay) {
                if (i <= 5) {
                  parsedPeriods.push(i);
                  parsedPeriods.push(i + 5);
                } else {
                  parsedPeriods.push(i);
                }
              } else {
                parsedPeriods.push(i);
              }
            }
            return;
          }
        }

        if (tok.startsWith('C')) {
          const num = parseInt(tok.substring(1));
          if (!isNaN(num)) {
            parsedPeriods.push(num <= 5 ? num + 5 : num);
          }
        } else if (tok.startsWith('S')) {
          const num = parseInt(tok.substring(1));
          if (!isNaN(num) && num <= 5) {
            parsedPeriods.push(num);
          }
        } else {
          const num = parseInt(tok);
          if (!isNaN(num)) {
            if (isAfternoon) {
              // Người dùng chọn Buổi Chiều -> 1..5 tự động thành 6..10
              parsedPeriods.push(num <= 5 ? num + 5 : num);
            } else if (isAllDay) {
              // Cả ngày -> thêm cả sáng và chiều
              if (num <= 5) {
                parsedPeriods.push(num);
                parsedPeriods.push(num + 5);
              } else {
                parsedPeriods.push(num);
              }
            } else {
              // Mặc định hoặc Buổi Sáng: 1..5 giữ nguyên 1..5, nếu người dùng đã gõ 6..10 vẫn nhận đúng 6..10
              parsedPeriods.push(num);
            }
          }
        }
      });

      const periods = Array.from(new Set(parsedPeriods)).filter(p => p >= 1 && p <= 10);
      
      if (!target || isNaN(day) || periods.length === 0) return;
      const content = String(getVal(constraint, 'Nội dung ghim / Cấm') || getVal(constraint, 'Nội dung') || '').trim();

      periods.forEach(period => {
        let actualPeriod = period;
        const targetLower = target.toLowerCase();
        if ((targetLower === 'tất cả các lớp chiều' || targetLower.includes('chiều') || targetLower.includes('chieu')) && actualPeriod <= 5 && !isAfternoon) {
          actualPeriod += 5; // Quy đổi 1..5 thành 6..10 cho buổi chiều
        }
        const timeKey = `${day}-${actualPeriod}`;
        
        if (targetLower === 'tất cả các lớp' || targetLower === 'tất cả các lớp sáng' || targetLower === 'tất cả các lớp chiều') {
          for (const [classId, dayMap] of classConfigMap.entries()) {
            // Lọc theo sáng / chiều dựa trên tổng số tiết
            let totalMorning = 0;
            let totalAfternoon = 0;
            dayMap.forEach(periods => {
               totalMorning += periods.filter(p => p <= 5).length;
               totalAfternoon += periods.filter(p => p >= 6).length;
            });
            
            const isMorningClass = totalMorning > totalAfternoon || (totalMorning === totalAfternoon && totalMorning > 0);
            const isAfternoonClass = totalAfternoon > totalMorning || (totalMorning === totalAfternoon && totalAfternoon > 0);

            if (targetLower === 'tất cả các lớp sáng' && !isMorningClass) continue;
            if (targetLower === 'tất cả các lớp chiều' && !isAfternoonClass) continue;
            
            if (!initialClassBlocks.has(classId)) initialClassBlocks.set(classId, new Set());
            initialClassBlocks.get(classId)?.add(timeKey);
            if (content) preAssignedSchedules.push({ classId, teacherId: '', subjectId: content, day, period: actualPeriod });
          }
        } else if (target.toLowerCase() === 'tất cả giáo viên') {
          for (const teacherId of initialTeacherBlocks.keys()) {
            initialTeacherBlocks.get(teacherId)?.add(timeKey);
            if (content) preAssignedSchedules.push({ classId: '', teacherId, subjectId: content, day, period: actualPeriod });
          }
        } else {
          const targetNorm = normalizeStr(target);

          // Block cho Tổ chuyên môn
          const matchingTeachers = teachers.filter(t => normalizeStr(getVal(t, 'Tổ chuyên môn')) === targetNorm);
          matchingTeachers.forEach(t => {
            const tId = String(getVal(t, 'Mã GV (*)') || '').trim();
            if (tId) {
              initialTeacherBlocks.get(tId)?.add(timeKey);
              if (content) preAssignedSchedules.push({ classId: '', teacherId: tId, subjectId: content, day, period: actualPeriod });
            }
          });
          
          // Block cho Giáo viên cụ thể
          const exactTeacher = teachers.find(t => normalizeStr(getVal(t, 'Mã GV (*)')) === targetNorm || normalizeStr(getVal(t, 'Họ và tên (*)')) === targetNorm);
          if (exactTeacher) {
            const tId = String(getVal(exactTeacher, 'Mã GV (*)') || '').trim();
            if (tId) {
              initialTeacherBlocks.get(tId)?.add(timeKey);
              if (content) preAssignedSchedules.push({ classId: '', teacherId: tId, subjectId: content, day, period: actualPeriod });
            }
          }
          
          // Block cho Lớp cụ thể
          let classId = classNameToIdMap.get(target.toLowerCase()) || target;
          // Fallback thử tìm không dấu
          if (!initialClassBlocks.has(classId)) {
             for (const [name, id] of classNameToIdMap.entries()) {
                 if (normalizeStr(name) === targetNorm) {
                     classId = id;
                     break;
                 }
             }
          }
          if (initialClassBlocks.has(classId)) {
            let classActualPeriod = period;
            const dayMap = classConfigMap.get(classId);
            if (dayMap) {
              let totalMorning = 0;
              let totalAfternoon = 0;
              dayMap.forEach(periods => {
                totalMorning += periods.filter(p => p <= 5).length;
                totalAfternoon += periods.filter(p => p >= 6).length;
              });
              if (totalAfternoon > totalMorning && classActualPeriod >= 1 && classActualPeriod <= 5 && !isAfternoon) {
                classActualPeriod += 5;
              }
            }
            const classTimeKey = `${day}-${classActualPeriod}`;
            initialClassBlocks.get(classId)?.add(classTimeKey);
            if (content) preAssignedSchedules.push({ classId, teacherId: '', subjectId: content, day, period: classActualPeriod });
          }
        }
      });
    }
  });

  // Tính toán tải phân công của từng giáo viên (Workload Density)
  const teacherTotalPeriods = new Map<string, number>();
  assignments.forEach(assignment => {
    const teacherId = String(getVal(assignment, 'Mã GV (*)') || '').trim();
    const numPeriods = parseInt(getVal(assignment, 'Số tiết/tuần (*)')) || 0;
    const assignedClasses = String(getVal(assignment, 'Lớp (*)') || '').split(',').map(c => c.trim()).filter(Boolean);
    teacherTotalPeriods.set(teacherId, (teacherTotalPeriods.get(teacherId) || 0) + numPeriods * assignedClasses.length);
  });

  // Flatten assignments into individual blocks of lessons
  let allLessons: Lesson[] = [];
  let lessonCounter = 0;
  
  assignments.forEach(assignment => {
    const teacherId = String(getVal(assignment, 'Mã GV (*)') || '').trim();
    const subjectId = String(getVal(assignment, 'Mã Môn (*)') || '').trim();
    const numPeriods = parseInt(getVal(assignment, 'Số tiết/tuần (*)')) || 0;
    const assignedClasses = String(getVal(assignment, 'Lớp (*)') || '').split(',').map(c => c.trim()).filter(Boolean);

    assignedClasses.forEach(className => {
      const classId = classNameToIdMap.get(className.toLowerCase()) || className;
      const maxConsecutive = subjectMaxConsecutive.get(subjectId) || 2;
      const isHardSubject = subjectIsHard.get(subjectId) || false;
      
      let remaining = numPeriods;
      let isFirstBlock = true;
      
      while (remaining > 0) {
        const size = Math.min(remaining, maxConsecutive);
        
        // YÊU CẦU: "Gom 1 lần thôi những tiết sau có thể tách tùy vào thực tế".
        // -> Chỉ block đầu tiên mới giữ cờ isHard (bắt buộc dính chùm). 
        // Các block sau của cùng môn đó sẽ bị ép thành isHard = false (linh hoạt, ưu tiên ghép nhưng cho phép tách).
        const isHard = isFirstBlock ? isHardSubject : false;
        
        allLessons.push({
          id: `L_${lessonCounter++}`,
          classId,
          teacherId,
          subjectId,
          size,
          isHard,
          teacherWorkload: teacherTotalPeriods.get(teacherId) || 0
        });
        remaining -= size;
        isFirstBlock = false;
      }
    });
  });

  // Tính toán dung lượng buổi sáng và tổng số tiết của từng lớp
  const classMorningCapacity = new Map<string, number>();
  const classTotalPeriods = new Map<string, number>();

  for (const [classId, dayMap] of classConfigMap.entries()) {
    let morningSlots = 0;
    dayMap.forEach(periods => {
      morningSlots += periods.filter(p => p <= 5).length;
    });
    classMorningCapacity.set(classId, morningSlots);
  }

  allLessons.forEach(l => {
    classTotalPeriods.set(l.classId, (classTotalPeriods.get(l.classId) || 0) + l.size);
  });

  // 2. Thuật toán AI: Stochastic Search with Dynamic Density & Ejection Chain Repair
  const MAX_RESTARTS = 500; // Chạy 500 lần thử nghiệm với thuật toán hoán đổi thông minh
  let bestSchedule: ScheduleItem[] = [];
  let bestUnassigned: any[] = [];
  let bestScore = -999999999;

  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    // Thông báo tiến độ
    if (restart % 10 === 0) {
      self.postMessage({ type: 'PROGRESS', payload: { progress: Math.round((restart / MAX_RESTARTS) * 100), message: `Đang tìm kiếm & tối ưu thế hệ ${restart}/${MAX_RESTARTS}...` }});
    }

    // Xáo trộn thứ tự tiết học ban đầu: Ưu tiên lớp 2 buổi, GV có tải dạy lớn và các khối tiết lớn
    let lessonsQueue = [...allLessons].sort((a, b) => {
      const aTwo = twoSessionClasses.has(a.classId) ? 1 : 0;
      const bTwo = twoSessionClasses.has(b.classId) ? 1 : 0;
      if (aTwo !== bTwo) return bTwo - aTwo;
      
      // Ưu tiên các GV dạy nhiều lớp (tải lớn) xếp trước để tránh nghẽn
      const aWork = a.teacherWorkload || 0;
      const bWork = b.teacherWorkload || 0;
      if (Math.abs(bWork - aWork) >= 6) {
        return (bWork - aWork) + (Math.random() * 4 - 2);
      }

      if (a.isHard !== b.isHard) return (b.isHard ? 1 : 0) - (a.isHard ? 1 : 0);
      if (b.size !== a.size) return b.size - a.size;
      return Math.random() - 0.5;
    });
    
    // Khôi phục block cứng
    const currentClassBlocks = new Map<string, Set<string>>();
    const currentTeacherBlocks = new Map<string, Set<string>>();
    const currentRoomBlocks = new Map<string, Set<string>>(); // Theo dõi phòng: roomId_index -> Set<timeKey>
    
    initialClassBlocks.forEach((val, key) => currentClassBlocks.set(key, new Set(val)));
    initialTeacherBlocks.forEach((val, key) => currentTeacherBlocks.set(key, new Set(val)));

    const currentSchedule: ScheduleItem[] = [...preAssignedSchedules];
    let currentUnassigned: any[] = [];
    let unassignedCount = 0;

    while (lessonsQueue.length > 0) {
      const lesson = lessonsQueue.shift()!;
      const dayMap = classConfigMap.get(lesson.classId);
      if (!dayMap) {
         unassignedCount += lesson.size;
         continue; 
      }

      const allowedDays = Array.from(dayMap.keys());
      const isTwoSession = twoSessionClasses.has(lesson.classId);

      let passes: Array<'morning' | 'afternoon'> = ['morning', 'afternoon'];
      if (!isTwoSession) {
        // Nếu lớp học 1 buổi (ví dụ chỉ học sáng hoặc chỉ học chiều), passes lấy theo cấu hình buổi của lớp
        const hasMorningSlots = Array.from(dayMap.values()).some(ps => ps.some(p => p <= 5));
        const hasAfternoonSlots = Array.from(dayMap.values()).some(ps => ps.some(p => p >= 6));
        if (hasMorningSlots && !hasAfternoonSlots) passes = ['morning'];
        else if (hasAfternoonSlots && !hasMorningSlots) passes = ['afternoon'];
      }
      
      let scheduled = false;
      
      // Random scores for tie-breaking to maintain Stochastic Search property safely
      const dayRandomScores = new Map<number, number>();
      for (const d of allowedDays) dayRandomScores.set(d, Math.random());
      
      // Fetch old schedule preference
      const oldAssigned = oldScheduleMap.get(`${lesson.classId}_${lesson.teacherId}_${lesson.subjectId}`) || [];

      for (const pass of passes) {
        if (scheduled) break;
        
        // Dồn lịch: Ưu tiên xếp vào những ngày ĐÃ CÓ tiết của buổi này (Sáng hoặc Chiều) VÀ giáo viên đã có tiết.
        const days = [...allowedDays].sort((dayA, dayB) => {
          // BOOST for oldSchedule baseline
          let oldDayA = oldAssigned.some(o => o.day === dayA) ? 1 : 0;
          let oldDayB = oldAssigned.some(o => o.day === dayB) ? 1 : 0;
          if (oldDayA !== oldDayB) return oldDayB - oldDayA; // DESCENDING
          const periodsA = dayMap.get(dayA) || [];
          const periodsB = dayMap.get(dayB) || [];
          const passPeriodsA = periodsA.filter(p => pass === 'morning' ? p <= 5 : p >= 6);
          const passPeriodsB = periodsB.filter(p => pass === 'morning' ? p <= 5 : p >= 6);

          let classCountA = 0;
          let classCountB = 0;
          for (const p of passPeriodsA) {
             if (currentClassBlocks.get(lesson.classId)?.has(`${dayA}-${p}`)) classCountA++;
          }
          for (const p of passPeriodsB) {
             if (currentClassBlocks.get(lesson.classId)?.has(`${dayB}-${p}`)) classCountB++;
          }
          
          let teacherCountA = 0;
          let teacherCountB = 0;
          for (let p = 1; p <= 10; p++) {
             if (currentTeacherBlocks.get(lesson.teacherId)?.has(`${dayA}-${p}`)) teacherCountA++;
             if (currentTeacherBlocks.get(lesson.teacherId)?.has(`${dayB}-${p}`)) teacherCountB++;
          }

          // Trọng số:
          // Với buổi Sáng: Cực kỳ ưu tiên dồn kín từng ngày để đạt 5/5 tiết trước khi sang ngày khác
          let classScoreA = classCountA * 2;
          let classScoreB = classCountB * 2;

          if (pass === 'morning' && isTwoSession) {
             // Ưu tiên ngày nào đã có tiết buổi sáng thì dồn cho FULL 5 tiết
             if (classCountA > 0 && classCountA < passPeriodsA.length) classScoreA += 15;
             if (classCountB > 0 && classCountB < passPeriodsB.length) classScoreB += 15;
          }

          if (pass === 'afternoon') {
              // Rất ưu tiên dồn tiết buổi chiều cho học sinh để họ không phải lên trường nhiều buổi chiều
              classScoreA = classCountA * 20;
              classScoreB = classCountB * 20;
          }

          const scoreA = classScoreA + teacherCountA * 5;
          const scoreB = classScoreB + teacherCountB * 5;

          if (scoreA !== scoreB) return scoreB - scoreA; // DESCENDING
          return dayRandomScores.get(dayB)! - dayRandomScores.get(dayA)!;
        });
        for (const day of days) {
          if (scheduled) break;
          
          const allowedPeriodsForDay = dayMap.get(day) || [];
          const currentAllowedPeriods = allowedPeriodsForDay.filter(p => pass === 'morning' ? p <= 5 : p >= 6);
          if (currentAllowedPeriods.length === 0) continue; // Skip if day doesn't allow this pass

          // Tránh xếp cùng môn học nhiều lần trong 1 ngày vượt quá maxConsecutive
          const existingSubjectCountInDay = currentSchedule.filter(i => i.classId === lesson.classId && i.day === day && i.subjectId === lesson.subjectId).length;
          if (existingSubjectCountInDay + lesson.size > (subjectMaxConsecutive.get(lesson.subjectId) || 2)) {
            continue; 
          }

          // Quét tất cả các tiết trong buổi để tìm vị trí trống liên tục phù hợp cho cả lớp và giáo viên
          
          // Ưu tiên xếp gọn tiết: Tính điểm độ liền mạch để ưu tiên các vị trí không tạo ra tiết thủng
          const pIndices = [];
          for (let i = 0; i <= currentAllowedPeriods.length - lesson.size; i++) {
             pIndices.push(i);
          }
          
          const teacherExistingPeriods: number[] = [];
          for (let p = 1; p <= 10; p++) {
             if (currentTeacherBlocks.get(lesson.teacherId)?.has(`${day}-${p}`)) {
                teacherExistingPeriods.push(p);
             }
          }
          
          const classExistingPeriods: number[] = [];
          for (let p = 1; p <= 10; p++) {
             if (currentClassBlocks.get(lesson.classId)?.has(`${day}-${p}`)) {
                classExistingPeriods.push(p);
             }
          }

          pIndices.sort((a, b) => {
             const getScore = (pIdx: number) => {
                const candidatePeriods = [];
                for (let s = 0; s < lesson.size; s++) candidatePeriods.push(currentAllowedPeriods[pIdx + s]);
                
                const cSet = [...classExistingPeriods, ...candidatePeriods];
                let classInternalGap = 0;
                let classLeadingEmpty = 0;
                
                if (cSet.length > 0) {
                   const minP = Math.min(...cSet);
                   const maxP = Math.max(...cSet);
                   classInternalGap = maxP - minP + 1 - cSet.length;
                   // Khoảng trống từ tiết đầu tiên của buổi đến tiết bắt đầu của lớp
                   classLeadingEmpty = Math.max(0, minP - currentAllowedPeriods[0]);
                }

                const tSet = [...teacherExistingPeriods, ...candidatePeriods];
                let teacherGap = 0;
                if (tSet.length > 0) {
                   teacherGap = Math.max(...tSet) - Math.min(...tSet) + 1 - tSet.length;
                }
                
                // Trọng số ưu tiên: Lớp học tuyệt đối không được lủng lỗ ở giữa và không được trống đầu buổi
                const classPenalty = classInternalGap * 5000 + classLeadingEmpty * 1000;
                
                // BOOST for oldSchedule
                let matchedOldPeriods = 0;
                for (const p of candidatePeriods) {
                  if (oldAssigned.some(old => old.day === day && old.period === p)) {
                    matchedOldPeriods++;
                  }
                }
                const oldScheduleBonus = matchedOldPeriods * -100000;

                return { classPenalty: classPenalty + oldScheduleBonus, teacherGap };
             };
             
             const scoreA = getScore(a);
             const scoreB = getScore(b);
             
             if (scoreA.classPenalty !== scoreB.classPenalty) {
                return scoreA.classPenalty - scoreB.classPenalty;
             }
             if (scoreA.teacherGap !== scoreB.teacherGap) {
                return scoreA.teacherGap - scoreB.teacherGap;
             }
             
             return a - b; // Ưu tiên xếp sớm nhất có thể trong buổi (từ Tiết 1)
          });

          for (const pIndex of pIndices) {
            let currentFit = true;
            let selectedRoomKey = '';
            let selectedRoomName = '';
            
            // Xử lý ràng buộc Phòng học (Chỉ dùng đúng các phòng đã được cấu hình trong bảng Phòng học)
            const subNorm = normalizeStr(lesson.subjectId);
            const subNameNorm = normalizeStr(subjectIdToNameMap.get(lesson.subjectId) || '');
            const isTinHocLesson = (
              subNorm === 'tin' || 
              subNorm.startsWith('tin') || 
              subNameNorm.startsWith('tin') || 
              subNorm.includes('maytinh') || 
              subNameNorm.includes('maytinh')
            );

            let reqRoomType = subjectReqRoom.get(lesson.subjectId) || 
                              subjectReqRoom.get(subNorm) || 
                              getCanonicalRoomType(lesson.subjectId) ||
                              (subNameNorm ? getCanonicalRoomType(subNameNorm) : '');
            
            if (!reqRoomType && isTinHocLesson) {
               reqRoomType = 'PHONG_TIN';
            }
            if (reqRoomType) {
               const availableRooms = roomsByType.get(reqRoomType) || 
                                      roomsByType.get(normalizeRoomId(reqRoomType)) || 
                                      roomsByType.get(getCanonicalRoomType(reqRoomType)) || [];
               
               if (availableRooms.length > 0) {
                 let roomFound = false;
                 const teacherIdNorm = normalizeStr(lesson.teacherId);
                 const teacherNameNorm = normalizeStr(teacherIdToNameMap.get(lesson.teacherId) || teacherIdToNameMap.get(teacherIdNorm) || '');
                 
                 // 1. Kiểm tra ưu tiên phòng cố định của giáo viên này
                 const fixedRoom = availableRooms.find(r => {
                    if (!r.fixedTeacherId) return false;
                    const rFixedNorm = normalizeStr(r.fixedTeacherId);
                    return rFixedNorm === teacherIdNorm || 
                           rFixedNorm === teacherNameNorm ||
                           (teacherNameNorm && (rFixedNorm.includes(teacherNameNorm) || teacherNameNorm.includes(rFixedNorm))) ||
                           (teacherIdNorm && (rFixedNorm.includes(teacherIdNorm) || teacherIdNorm.includes(rFixedNorm)));
                 });
                 
                 if (fixedRoom) {
                    let rFree = true;
                    for (let s = 0; s < lesson.size; s++) {
                      const p = currentAllowedPeriods[pIndex + s];
                      const timeKey = `${day}-${p}`;
                      if (currentRoomBlocks.get(fixedRoom.roomId)?.has(timeKey)) {
                         rFree = false;
                         break;
                      }
                    }
                    if (rFree) {
                       roomFound = true;
                       selectedRoomKey = fixedRoom.roomId;
                       selectedRoomName = fixedRoom.roomName;
                    }
                 }
                 
                 // 2. Nếu phòng cố định bận hoặc GV không có phòng cố định -> Mượn các phòng khác còn trống
                 if (!roomFound) {
                    const fallbackRooms = availableRooms.filter(r => r !== fixedRoom);
                    for (const r of fallbackRooms) {
                      let rFree = true;
                      for (let s = 0; s < lesson.size; s++) {
                        const p = currentAllowedPeriods[pIndex + s];
                        const timeKey = `${day}-${p}`;
                        if (currentRoomBlocks.get(r.roomId)?.has(timeKey)) {
                           rFree = false;
                           break;
                        }
                      }
                      if (rFree) {
                         roomFound = true;
                         selectedRoomKey = r.roomId;
                         selectedRoomName = r.roomName;
                         break;
                      }
                    }
                 }

                 // Nếu môn này có phòng học bắt buộc mà không còn phòng nào trống ở tiết này -> Bỏ qua vị trí này
                 if (!roomFound) currentFit = false; 
               }
            }

            for (let s = 0; s < lesson.size; s++) {
               if (!currentFit) break;
               const p = currentAllowedPeriods[pIndex + s];
               const timeKey = `${day}-${p}`;
               if (!currentTeacherBlocks.has(lesson.teacherId)) currentTeacherBlocks.set(lesson.teacherId, new Set());
               if (!currentClassBlocks.has(lesson.classId)) currentClassBlocks.set(lesson.classId, new Set());
               
               const isTeacherFree = !currentTeacherBlocks.get(lesson.teacherId)?.has(timeKey);
               const isClassFree = !currentClassBlocks.get(lesson.classId)?.has(timeKey);
               
               if (!isTeacherFree || !isClassFree) {
                 currentFit = false;
                 break;
               }
            }

            if (currentFit) {
               for (let s = 0; s < lesson.size; s++) {
                 const p = currentAllowedPeriods[pIndex + s];
                 const timeKey = `${day}-${p}`;
                 
                 const scheduleItem: ScheduleItem = {
                   classId: lesson.classId,
                   teacherId: lesson.teacherId,
                   subjectId: lesson.subjectId,
                   day,
                   period: p
                 };
                 if (selectedRoomName) scheduleItem.roomId = selectedRoomName;
                 
                 currentSchedule.push(scheduleItem);
                 
                 if (selectedRoomKey) {
                   if (!currentRoomBlocks.has(selectedRoomKey)) currentRoomBlocks.set(selectedRoomKey, new Set());
                   currentRoomBlocks.get(selectedRoomKey)?.add(timeKey);
                 }
                 currentClassBlocks.get(lesson.classId)?.add(timeKey);
                 currentTeacherBlocks.get(lesson.teacherId)?.add(timeKey);
               }
               scheduled = true;
               break; // found a spot, break the pIndex loop
            }
          }

          if (scheduled) break;
        }
      }
      
      if (!scheduled) {
        // [QUY TẮC GHÉP TIẾT]: 
        // Nếu Khó (isHard = true) -> Phải giữ nguyên block. Không tách được.
        // Nếu Không (isHard = false) -> Được phép tách nhỏ (Split) tuỳ tình hình thực tế.
        if (!lesson.isHard && lesson.size > 1) {
          lessonsQueue.push({ ...lesson, size: 1 });
          lessonsQueue.push({ ...lesson, size: lesson.size - 1 });
        } else {
          unassignedCount += lesson.size;
          const tName = teacherIdToNameMap.get(lesson.teacherId) || lesson.teacherId;
          const sName = subjectIdToNameMap.get(lesson.subjectId) || lesson.subjectId;
          currentUnassigned.push({
            classId: lesson.classId,
            teacherId: lesson.teacherId,
            teacherName: tName,
            subjectId: lesson.subjectId,
            subjectName: sName,
            size: lesson.size,
            reason: 'Xung đột lịch trùng giữa Lớp, Giáo viên, Phòng học hoặc Ràng buộc nghỉ'
          });
        }
      }
    }

    // =========================================================================
    // SMART REPAIR ENGINE (Ejection & Displacement Chain Swaps)
    // Tự động gỡ các nút thắt trùng lịch bằng cách hoán đổi thông minh (Kempe Swaps)
    // =========================================================================
    if (currentUnassigned.length > 0) {
      let repairPass = 0;
      while (currentUnassigned.length > 0 && repairPass < 3) {
        repairPass++;
        const remainingUnassigned: typeof currentUnassigned = [];
        
        for (const unassignedItem of currentUnassigned) {
          let repaired = false;
          const dayMap = classConfigMap.get(unassignedItem.classId);
          if (dayMap && unassignedItem.size === 1) {
            const allowedDays = Array.from(dayMap.keys());
            
            // Pass 1: Subject Displacement (Dời môn khác cùng lớp sang slot trống để nhường chỗ)
            for (const day of allowedDays) {
              if (repaired) break;
              const allowedPeriods = dayMap.get(day) || [];
              for (const p of allowedPeriods) {
                if (repaired) break;
                const timeKey = `${day}-${p}`;
                
                // Kiểm tra GV của tiết bị kẹt có rảnh và không bị cấm tại (day, p)
                const isTeacherHardBlocked = initialTeacherBlocks.get(unassignedItem.teacherId)?.has(timeKey);
                const isTeacherOccupied = currentTeacherBlocks.get(unassignedItem.teacherId)?.has(timeKey);
                if (isTeacherHardBlocked || isTeacherOccupied) continue;

                // Kiểm tra giới hạn số tiết cùng môn trong ngày của tiết bị kẹt
                const unassignedDayCount = currentSchedule.filter(i => i.classId === unassignedItem.classId && i.day === day && i.subjectId === unassignedItem.subjectId).length;
                if (unassignedDayCount + 1 > (subjectMaxConsecutive.get(unassignedItem.subjectId) || 2)) continue;

                // Tìm môn đang học tại lớp này ở (day, p)
                const occIndex = currentSchedule.findIndex(i => i.classId === unassignedItem.classId && i.day === day && i.period === p);
                if (occIndex >= 0) {
                  const occItem = currentSchedule[occIndex];
                  // Thử tìm slot (dayAlt, pAlt) còn trống cho occItem
                  for (const dayAlt of allowedDays) {
                    if (repaired) break;
                    const allowedPeriodsAlt = dayMap.get(dayAlt) || [];
                    for (const pAlt of allowedPeriodsAlt) {
                      if (dayAlt === day && pAlt === p) continue;
                      const timeKeyAlt = `${dayAlt}-${pAlt}`;
                      const isClassFreeAlt = !currentClassBlocks.get(unassignedItem.classId)?.has(timeKeyAlt);
                      const isOccTeacherHardBlockedAlt = initialTeacherBlocks.get(occItem.teacherId)?.has(timeKeyAlt);
                      const isOccTeacherOccupiedAlt = currentTeacherBlocks.get(occItem.teacherId)?.has(timeKeyAlt);
                      
                      if (isClassFreeAlt && !isOccTeacherHardBlockedAlt && !isOccTeacherOccupiedAlt) {
                        const occDayCount = currentSchedule.filter(i => i !== occItem && i.classId === occItem.classId && i.day === dayAlt && i.subjectId === occItem.subjectId).length;
                        if (occDayCount + 1 <= (subjectMaxConsecutive.get(occItem.subjectId) || 2)) {
                          // HOÁN ĐỔI THÀNH CÔNG: Dời occItem sang (dayAlt, pAlt) và đặt unassignedItem vào (day, p)
                          currentClassBlocks.get(unassignedItem.classId)?.delete(timeKey);
                          currentTeacherBlocks.get(occItem.teacherId)?.delete(timeKey);
                          currentClassBlocks.get(unassignedItem.classId)?.add(timeKeyAlt);
                          currentTeacherBlocks.get(occItem.teacherId)?.add(timeKeyAlt);
                          occItem.day = dayAlt;
                          occItem.period = pAlt;

                          currentClassBlocks.get(unassignedItem.classId)?.add(timeKey);
                          currentTeacherBlocks.get(unassignedItem.teacherId)?.add(timeKey);
                          currentSchedule.push({
                            classId: unassignedItem.classId,
                            teacherId: unassignedItem.teacherId,
                            subjectId: unassignedItem.subjectId,
                            day,
                            period: p
                          });

                          unassignedCount -= unassignedItem.size;
                          repaired = true;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }

            // Pass 2: Teacher Displacement (Dời lớp khác của GV này sang slot khác để nhường GV cho lớp hiện tại)
            if (!repaired) {
              for (const day of allowedDays) {
                if (repaired) break;
                const allowedPeriods = dayMap.get(day) || [];
                for (const p of allowedPeriods) {
                  if (repaired) break;
                  const timeKey = `${day}-${p}`;
                  
                  const isClassFree = !currentClassBlocks.get(unassignedItem.classId)?.has(timeKey);
                  const isTeacherHardBlocked = initialTeacherBlocks.get(unassignedItem.teacherId)?.has(timeKey);
                  if (!isClassFree || isTeacherHardBlocked) continue;

                  const unassignedDayCount = currentSchedule.filter(i => i.classId === unassignedItem.classId && i.day === day && i.subjectId === unassignedItem.subjectId).length;
                  if (unassignedDayCount + 1 > (subjectMaxConsecutive.get(unassignedItem.subjectId) || 2)) continue;

                  // Tìm lớp mà GV này đang đứng dạy tại (day, p)
                  const occTeacherIndex = currentSchedule.findIndex(i => i.teacherId === unassignedItem.teacherId && i.day === day && i.period === p);
                  if (occTeacherIndex >= 0) {
                    const occTeacherItem = currentSchedule[occTeacherIndex];
                    const occClassDayMap = classConfigMap.get(occTeacherItem.classId);
                    if (occClassDayMap) {
                      const occClassAllowedDays = Array.from(occClassDayMap.keys());
                      for (const dayAlt of occClassAllowedDays) {
                        if (repaired) break;
                        const occClassPeriodsAlt = occClassDayMap.get(dayAlt) || [];
                        for (const pAlt of occClassPeriodsAlt) {
                          if (dayAlt === day && pAlt === p) continue;
                          const timeKeyAlt = `${dayAlt}-${pAlt}`;
                          const isOccClassFreeAlt = !currentClassBlocks.get(occTeacherItem.classId)?.has(timeKeyAlt);
                          const isTeacherOccupiedAlt = currentTeacherBlocks.get(unassignedItem.teacherId)?.has(timeKeyAlt);
                          const isTeacherHardAlt = initialTeacherBlocks.get(unassignedItem.teacherId)?.has(timeKeyAlt);

                          if (isOccClassFreeAlt && !isTeacherOccupiedAlt && !isTeacherHardAlt) {
                            const occDayCount = currentSchedule.filter(i => i !== occTeacherItem && i.classId === occTeacherItem.classId && i.day === dayAlt && i.subjectId === occTeacherItem.subjectId).length;
                            if (occDayCount + 1 <= (subjectMaxConsecutive.get(occTeacherItem.subjectId) || 2)) {
                              // Dời occTeacherItem sang (dayAlt, pAlt)
                              currentClassBlocks.get(occTeacherItem.classId)?.delete(timeKey);
                              currentTeacherBlocks.get(unassignedItem.teacherId)?.delete(timeKey);
                              currentClassBlocks.get(occTeacherItem.classId)?.add(timeKeyAlt);
                              currentTeacherBlocks.get(unassignedItem.teacherId)?.add(timeKeyAlt);
                              occTeacherItem.day = dayAlt;
                              occTeacherItem.period = pAlt;

                              // Xếp unassignedItem vào (day, p)
                              currentClassBlocks.get(unassignedItem.classId)?.add(timeKey);
                              currentTeacherBlocks.get(unassignedItem.teacherId)?.add(timeKey);
                              currentSchedule.push({
                                classId: unassignedItem.classId,
                                teacherId: unassignedItem.teacherId,
                                subjectId: unassignedItem.subjectId,
                                day,
                                period: p
                              });

                              unassignedCount -= unassignedItem.size;
                              repaired = true;
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          if (!repaired) {
            remainingUnassigned.push(unassignedItem);
          }
        }
        
        currentUnassigned = remainingUnassigned;
      }
    }

    let score = - (unassignedCount * 10000000);

    let classAfternoonDaysPenalty = 0;
    let teacherDaysPenalty = 0;

    const teacherDays = new Map<string, Set<number>>();
    const classAfternoonDays = new Map<string, Set<number>>();

    currentSchedule.forEach(item => {
        if (item.teacherId) {
            if (!teacherDays.has(item.teacherId)) teacherDays.set(item.teacherId, new Set());
            teacherDays.get(item.teacherId)!.add(item.day);
        }
        if (item.classId && item.period >= 6) {
            if (!classAfternoonDays.has(item.classId)) classAfternoonDays.set(item.classId, new Set());
            classAfternoonDays.get(item.classId)!.add(item.day);
        }
    });

    for (const [classId, days] of classAfternoonDays.entries()) {
        if (twoSessionClasses.has(classId)) {
            classAfternoonDaysPenalty += days.size;
            // Nếu học > 2 buổi chiều, phạt lũy tiến nặng hơn
            if (days.size > 2) {
                classAfternoonDaysPenalty += (days.size - 2) * 10;
            }
        }
    }

    // Tính toán Gap Penalty (Phạt CỰC NẶNG nếu lớp học bị rỗng tiết ở giữa hoặc rỗng tiết đầu buổi)
    let classGapPenalty = 0;
    const classDays = new Map<string, Set<number>>();
    currentSchedule.forEach(item => {
        if (!classDays.has(item.classId)) classDays.set(item.classId, new Set());
        classDays.get(item.classId)!.add(item.day);
    });

    for (const [classId, days] of classDays.entries()) {
        const dayMap = classConfigMap.get(classId);
        for (const day of days) {
            const allowedPeriodsForDay = dayMap?.get(day) || [];
            const allowedMorning = allowedPeriodsForDay.filter(p => p <= 5);
            const allowedAfternoon = allowedPeriodsForDay.filter(p => p >= 6);

            const morningPeriods = currentSchedule.filter(i => i.classId === classId && i.day === day && i.period <= 5).map(i => i.period).sort((a,b)=>a-b);
            const afternoonPeriods = currentSchedule.filter(i => i.classId === classId && i.day === day && i.period >= 6).map(i => i.period).sort((a,b)=>a-b);
            
            if (morningPeriods.length > 0) {
               // 1. Phạt nếu có lỗ hổng ở giữa buổi sáng (ví dụ: học tiết 1, tiết 3)
               const internalGap = morningPeriods[morningPeriods.length - 1] - morningPeriods[0] + 1 - morningPeriods.length;
               classGapPenalty += internalGap * 100000;

               // 2. Phạt nếu để trống các tiết đầu buổi sáng (ví dụ: buổi sáng không học tiết 1 mà bắt đầu từ tiết 3 hoặc 4)
               if (allowedMorning.length > 0 && morningPeriods[0] > allowedMorning[0]) {
                 const leadingGap = morningPeriods[0] - allowedMorning[0];
                 classGapPenalty += leadingGap * 80000;
               }
            }

            if (afternoonPeriods.length > 0) {
               // 1. Phạt nếu có lỗ hổng ở giữa buổi chiều
               const internalGap = afternoonPeriods[afternoonPeriods.length - 1] - afternoonPeriods[0] + 1 - afternoonPeriods.length;
               classGapPenalty += internalGap * 100000;

               // 2. Phạt nếu để trống các tiết đầu buổi chiều (không học từ tiết đầu buổi chiều)
               if (allowedAfternoon.length > 0 && afternoonPeriods[0] > allowedAfternoon[0]) {
                 const leadingGap = afternoonPeriods[0] - allowedAfternoon[0];
                 classGapPenalty += leadingGap * 80000;
               }
            }
        }
    }

    for (const days of teacherDays.values()) {
        teacherDaysPenalty += days.size;
    }

    // Phạt CỰC NẶNG nếu lớp 2 buổi chưa được lấp đầy 100% tiết buổi sáng
    let unfilledMorningPenalty = 0;
    for (const classId of twoSessionClasses) {
      const morningCap = classMorningCapacity.get(classId) || 0;
      const totalClassLessons = classTotalPeriods.get(classId) || 0;
      const targetMorning = Math.min(morningCap, totalClassLessons);
      
      let actualMorning = 0;
      for (const item of currentSchedule) {
        if (item.classId === classId && item.period <= 5) actualMorning++;
      }
      
      if (actualMorning < targetMorning) {
        const deficit = targetMorning - actualMorning;
        unfilledMorningPenalty += deficit * 500000;
      }
    }

    score -= (classAfternoonDaysPenalty * 5000);
    score -= (teacherDaysPenalty * 100);
    score -= classGapPenalty; // Phạt triệt để mọi trường hợp lủng lỗ của học sinh
    score -= unfilledMorningPenalty; // Phạt triệt để nếu buổi sáng chưa FULL tiết

    if (score > bestScore || bestSchedule.length === 0) {
      bestScore = score;
      bestSchedule = [...currentSchedule];
      bestUnassigned = [...currentUnassigned];
    }
  }

  const totalRequiredPeriods = allLessons.reduce((sum, l) => sum + l.size, 0);

  return {
    schedule: bestSchedule,
    unassignedLessons: bestUnassigned,
    totalRequiredPeriods,
    scheduledPeriods: bestSchedule.filter(s => s.teacherId && s.classId).length
  } as any;
}
