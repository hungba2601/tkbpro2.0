import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, FileSpreadsheet, Search, ChevronDown, Check, X, AlertCircle, 
  CheckCircle2, AlertTriangle, ShieldAlert, BarChart3, Eye, Calendar,
  Sparkles, Settings, Copy, RefreshCw, Loader2, Lightbulb, AlertOctagon,
  CheckCheck
} from 'lucide-react';
import { loadFromCloud } from '../utils/cloudApi';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { ApiKeyModal } from './ApiKeyModal';
import { 
  getStoredApiKey, 
  getStoredAiModel, 
  analyzeTimetableErrors, 
  auditAssignmentsAgainstCurriculum,
  type AiDiagnosticReport, 
  AI_MODELS 
} from '../utils/aiDiagnostic';

import { exportTimetableToExcel } from '../utils/exportExcel';
import { exportTimetableToWord } from '../utils/exportWord';
import type { ScheduleItem } from '../utils/scheduler';
import './TimetableSection.css';

type ViewMode = 'Toàn trường' | 'Toàn trường CSDL' | 'Lớp' | 'Giáo viên' | 'Tổ' | 'Đối soát phân công';

interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

function removeVietnameseTones(str: string): string {
  let strClean = String(str || '');
  strClean = strClean.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  strClean = strClean.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  strClean = strClean.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  strClean = strClean.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  strClean = strClean.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  strClean = strClean.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  strClean = strClean.replace(/đ/g, "d");
  strClean = strClean.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "a");
  strClean = strClean.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "e");
  strClean = strClean.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "i");
  strClean = strClean.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "o");
  strClean = strClean.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "u");
  strClean = strClean.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "y");
  strClean = strClean.replace(/Đ/g, "d");
  strClean = strClean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return strClean.toLowerCase().trim();
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Tìm kiếm...",
}: {
  options: SearchableOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return options;
    
    const termRaw = trimmed.toLowerCase();
    const termNoTone = removeVietnameseTones(trimmed);
    const searchWords = termNoTone.split(/\s+/).filter(Boolean);

    return options.filter(opt => {
      const labelRaw = String(opt.label || '').toLowerCase();
      const labelNoTone = removeVietnameseTones(opt.label);
      const valRaw = String(opt.value || '').toLowerCase();
      const subRaw = String(opt.subLabel || '').toLowerCase();

      // 1. Khớp trực tiếp chuỗi không dấu hoặc có dấu
      if (labelRaw.includes(termRaw) || labelNoTone.includes(termNoTone) || valRaw.includes(termRaw) || subRaw.includes(termRaw)) {
        return true;
      }

      // 2. Khớp từng từ (Ví dụ: gõ "Phi Hùng" khớp "Nguyễn Phi Hùng")
      if (searchWords.length > 0) {
        const matchAllWords = searchWords.every(w => labelNoTone.includes(w) || valRaw.includes(w) || subRaw.includes(w));
        if (matchAllWords) return true;
      }

      return false;
    });
  }, [options, searchTerm]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="searchable-select-container" ref={containerRef}>
      <div 
        className={`searchable-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <div className="trigger-content">
          {selectedOption ? (
            <span className="selected-text">
              <strong className="selected-main">{selectedOption.label}</strong>
              {selectedOption.subLabel && <span className="selected-sub"> ({selectedOption.subLabel})</span>}
            </span>
          ) : (
            <span className="placeholder-text">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
      </div>

      {isOpen && (
        <div className="searchable-dropdown-menu">
          <div className="dropdown-search-wrapper" onClick={e => e.stopPropagation()}>
            <Search size={16} className="search-icon-inside" />
            <input 
              ref={inputRef}
              type="text"
              className="dropdown-search-input"
              placeholder={placeholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {searchTerm && (
              <button 
                type="button" 
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="dropdown-options-list">
            {filteredOptions.length === 0 ? (
              <div className="no-options-found">Không tìm thấy giáo viên nào phù hợp</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  className={`dropdown-option-item ${opt.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <div className="option-info">
                    <span className="option-label">{opt.label}</span>
                    {opt.subLabel && <span className="option-sublabel">({opt.subLabel})</span>}
                  </div>
                  {opt.value === value && <Check size={16} className="check-icon" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimetableSection() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [oldScheduleBaseline, setOldScheduleBaseline] = useState<ScheduleItem[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Toàn trường');
  const [generateStatus, setGenerateStatus] = useState<string>('');
  
  // States cho các bộ lọc
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  
  // Bộ lọc cho chế độ Toàn trường
  const [schoolFilterGrade, setSchoolFilterGrade] = useState<string>('Tất cả');
  const [schoolFilterSession, setSchoolFilterSession] = useState<string>('Tất cả');
  const [schoolSearchClass, setSchoolSearchClass] = useState<string>('');

  // States cho tính năng Cảnh báo & Đối soát phân công
  const [unassignedLessons, setUnassignedLessons] = useState<any[]>([]);
  const [rawAssignments, setRawAssignments] = useState<any[]>([]);
  const [auditStats, setAuditStats] = useState<{ totalRequired: number; scheduled: number } | null>(null);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditOnlyMissing, setAuditOnlyMissing] = useState<boolean>(false);

  // States cho tính năng AI Chẩn đoán & Tìm lỗi TKB
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<AiDiagnosticReport | null>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // State cho Modal xem TKB riêng biệt (không nhảy tab)
  const [modalTarget, setModalTarget] = useState<{ type: 'class' | 'teacher'; id: string } | null>(null);
  
  // Danh sách từ data
  const [classesList, setClassesList] = useState<string[]>([]);
  const [rawClassesList, setRawClassesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [constraintsList, setConstraintsList] = useState<any[]>([]);

  const DEFAULT_ROOMS = [
    { 'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_1', 'Tên Phòng (*)': 'Phòng tin 1', 'GV Cố định': 'Nguyễn Phi Hùng (7913698240)' },
    { 'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_2', 'Tên Phòng (*)': 'Phòng tin 2', 'GV Cố định': 'Nguyễn Thị Lý (7904801482)' },
    { 'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_3', 'Tên Phòng (*)': 'Phòng tin 3', 'GV Cố định': 'Phạm Nguyên Hưng (7900570373)' }
  ];
  const [roomsList, setRoomsList] = useState<any[]>(DEFAULT_ROOMS);

  // Tự động load dữ liệu Lớp học & Phân công theo tài khoản hiện tại để đối soát ngay
  useEffect(() => {
    try {
      const storedClasses = getUserItem('data_Lớp học');
      if (storedClasses) {
        const parsed = JSON.parse(storedClasses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRawClassesList(parsed);
        } else {
          setRawClassesList([]);
        }
      } else {
        setRawClassesList([]);
      }

      const storedAssignments = getUserItem('data_Phân công');
      if (storedAssignments) {
        const parsed = JSON.parse(storedAssignments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRawAssignments(parsed);
        } else {
          setRawAssignments([]);
        }
      } else {
        setRawAssignments([]);
      }
    } catch {}
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setAiReport(null);
    setAiAnalysisError(null);
    try {
      const getLocalData = async (sheetName: string, step: string) => {
        try {
          const stored = getUserItem(`data_${sheetName}`);
          const parsed = stored ? JSON.parse(stored) : null;
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {}
        
        setGenerateStatus(`Đang tải dữ liệu ${sheetName} (${step})...`);
        try {
          const data = await loadFromCloud(sheetName);
          if (data && Array.isArray(data) && data.length > 0) {
            setUserItem(`data_${sheetName}`, JSON.stringify(data));
            return data;
          }
        } catch (e) {}

        if (sheetName === 'Phòng học') {
          return DEFAULT_ROOMS;
        }

        return [];
      };

      setGenerateStatus('Đang tổng hợp dữ liệu...');
      
      const classes = await getLocalData('Lớp học', '1/6');
      const teachers = await getLocalData('Giáo viên', '2/6');
      const subjects = await getLocalData('Môn học', '3/6');
      const rooms = await getLocalData('Phòng học', '4/6');
      const assignments = await getLocalData('Phân công', '5/6');
      const constraints = await getLocalData('Ràng buộc', '6/6');

      if (assignments.length === 0) {
        alert("Chưa có dữ liệu Phân công! Vui lòng nhập dữ liệu Phân công trước khi xếp TKB.");
        setIsGenerating(false);
        return;
      }

      setRawAssignments(assignments);
      setRawClassesList(classes);
      setRoomsList(rooms);
      setConstraintsList(constraints);
      setGenerateStatus('Đang phân tích và Xếp lịch...');

      const result = await new Promise<any>((resolve, reject) => {
        const worker = new Worker(new URL('../utils/scheduler.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
          if (e.data.type === 'SUCCESS') {
            resolve(e.data.payload);
            worker.terminate();
          } else if (e.data.type === 'PROGRESS') {
            // Cập nhật trạng thái tiến độ
            const { progress, message } = e.data.payload || {};
            const pct = progress !== undefined ? ` (${progress}%)` : '';
            setGenerateStatus((message || 'Đang xếp lịch...') + pct);
          } else if (e.data.type === 'ERROR') {
            reject(new Error(typeof e.data.payload === 'string' ? e.data.payload : JSON.stringify(e.data.payload)));
            worker.terminate();
          }
        };

        worker.onerror = (err) => {
          reject(new Error(err.message || 'Worker error'));
          worker.terminate();
        };

        worker.postMessage({
          type: 'START',
          payload: { classes, subjects, teachers, assignments, constraints, rooms, oldSchedule: oldScheduleBaseline }
        });
      });

      const scheduleList: ScheduleItem[] = Array.isArray(result) ? result : (result.schedule || []);
      const unassigned: any[] = Array.isArray(result) ? [] : (result.unassignedLessons || []);
      const totalReq = Array.isArray(result) ? scheduleList.length : (result.totalRequiredPeriods || scheduleList.length);
      const scheduledCount = Array.isArray(result) ? scheduleList.length : (result.scheduledPeriods || scheduleList.length);

      setUnassignedLessons(unassigned);
      setAuditStats({ totalRequired: totalReq, scheduled: scheduledCount });

      // Lấy danh sách lớp từ kết quả TKB (đảm bảo khớp với classId trong schedule)
      const clsFromSchedule = [...new Set(scheduleList.map((s: any) => String(s.classId || '')).filter(Boolean))];
      clsFromSchedule.sort((a, b) => a.localeCompare(b, 'vi'));
      setClassesList(clsFromSchedule);
      
      // Tổng hợp danh sách giáo viên đầy đủ từ cả Giáo viên, Phân công
      const teacherMapAll = new Map<string, string>();
      teachers.forEach((t: any) => {
        const id = String(t['Mã GV (*)'] || t['Mã GV'] || t['Mã giáo viên'] || t['MaGV'] || t['ID'] || '').trim();
        const name = String(t['Họ và tên (*)'] || t['Họ và tên'] || t['Tên GV (*)'] || t['Tên GV'] || t['Tên'] || t['Họ tên'] || id).trim();
        if (id) teacherMapAll.set(id, name || id);
      });

      assignments.forEach((a: any) => {
        const id = String(a['Mã GV (*)'] || a['Mã GV'] || a['Mã giáo viên'] || a['MaGV'] || '').trim();
        const name = String(a['Tên GV'] || a['Tên GV (*)'] || a['Họ và tên'] || '').trim();
        if (id) {
          if (!teacherMapAll.has(id) || (name && teacherMapAll.get(id) === id)) {
            teacherMapAll.set(id, name || id);
          }
        }
      });

      // Build map Mã GV -> Tổ chuyên môn từ dữ liệu gốc
      const teacherDeptMap = new Map<string, string>();
      teachers.forEach((t: any) => {
        const id = String(t['Mã GV (*)'] || t['Mã GV'] || t['Mã giáo viên'] || t['MaGV'] || t['ID'] || '').trim();
        const dept = String(t['Tổ chuyên môn'] || '').trim();
        if (id && dept) teacherDeptMap.set(id, dept);
      });

      const mergedTeachersList = Array.from(teacherMapAll.entries()).map(([id, name]) => ({
        'Mã GV (*)': id,
        'Họ và tên (*)': name,
        'Tổ chuyên môn': teacherDeptMap.get(id) || ''
      })).sort((a, b) => a['Họ và tên (*)'].localeCompare(b['Họ và tên (*)'], 'vi'));

      setTeachersList(mergedTeachersList);
      setSubjectsList(subjects);

      // Tổng hợp danh sách Tổ chuyên môn
      const deptSet = new Set<string>();
      mergedTeachersList.forEach(t => {
        const dept = String(t['Tổ chuyên môn'] || '').trim();
        if (dept) deptSet.add(dept);
      });
      const sortedDepts = Array.from(deptSet).sort((a, b) => a.localeCompare(b, 'vi'));
      setDepartmentsList(sortedDepts);
      if (sortedDepts.length > 0) setSelectedDepartment(sortedDepts[0]);

      if (clsFromSchedule.length > 0) setSelectedClass(clsFromSchedule[0]);
      if (mergedTeachersList.length > 0) setSelectedTeacher(mergedTeachersList[0]['Mã GV (*)']);

      setSchedule(scheduleList);      
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Lỗi khi xếp TKB: " + msg);
    } finally {
      setIsGenerating(false);
      setGenerateStatus('');
    }
  };

  // Hàm kích hoạt AI phân tích các trường hợp kẹt tiết
  const handleAnalyzeAiErrors = async () => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    if (unassignedLessons.length === 0) {
      alert("Tuyệt vời! Hiện tại đã xếp đủ 100% tiết theo phân công, không có trường hợp lỗi nào cần phân tích.");
      return;
    }

    setIsAiAnalyzing(true);
    setAiAnalysisError(null);
    try {
      const report = await analyzeTimetableErrors({
        unassignedLessons,
        schedule,
        rawAssignments,
        constraints: constraintsList,
        classes: rawClassesList,
        teachers: teachersList,
        subjects: subjectsList,
        rooms: roomsList
      });
      setAiReport(report);
    } catch (err: any) {
      if (err?.message === 'NO_API_KEY') {
        setIsApiKeyModalOpen(true);
      } else {
        setAiAnalysisError(err?.message || 'Không thể hoàn thành phân tích AI.');
      }
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Hàm sao chép nội dung báo cáo chẩn đoán AI
  const handleCopyReport = () => {
    if (!aiReport) return;
    let content = `BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN & HƯỚNG DẪN SỬA LỖI TKB (GOOGLE GEMINI AI)\n`;
    content += `Mô hình: ${aiReport.modelUsed} | Thời gian: ${aiReport.timestamp}\n\n`;
    content += `1. TỔNG QUAN NGUYÊN NHÂN:\n${aiReport.summary}\n\n`;

    if (aiReport.classIssues && aiReport.classIssues.some(c => c.isOverCapacity || c.hasCurriculumError)) {
      content += `2. ĐỐI SOÁT CHI TIẾT THEO LỚP HỌC:\n`;
      aiReport.classIssues.filter(c => c.isOverCapacity || c.hasCurriculumError).forEach(c => {
        content += `\n* LỚP ${c.classId} (Khối ${c.grade} - ${c.sessionType}): Phân công ${c.totalAssignedPeriods}/${c.maxWeeklyCapacity} tiết/tuần ${c.isOverCapacity ? `[QUÁ TẢI ${c.capacityDiff} TIẾT]` : ''}\n`;
        content += `  - Tình trạng: ${c.summary}\n`;
        content += `  - Hướng xử lý: ${c.actionSolution}\n`;
      });
      content += `\n`;
    }

    if (aiReport.curriculumConflicts && aiReport.curriculumConflicts.length > 0) {
      content += `3. MÔN HỌC SAI ĐỊNH MỨC CHUẨN CT GDPT 2018:\n`;
      aiReport.curriculumConflicts.forEach(c => {
        content += `  - Lớp ${c.classId} môn ${c.subjectDisplayName}: Phân công ${c.totalAssigned}t (Chuẩn: ${c.standardRequired}t) -> ${c.diff > 0 ? `Thừa ${c.diff}t` : `Thiếu ${Math.abs(c.diff)}t`}\n`;
      });
      content += `\n`;
    }

    content += `4. CHI TIẾT TỪNG GIÁO VIÊN BỊ KẸT TIẾT:\n`;
    aiReport.teacherIssues.forEach((issue, idx) => {
      content += `\n[${idx + 1}] GV: ${issue.teacherName} (${issue.teacherId}) - Môn: ${issue.subjectName} (Lớp ${issue.classId}) - Thiếu: ${issue.missingPeriods} tiết\n`;
      content += `  • Nguyên nhân cụ thể: ${issue.rootCause}\n`;
      content += `  • Hướng dẫn khắc phục: ${issue.actionableSolution}\n`;
    });

    if (aiReport.generalSolutions && aiReport.generalSolutions.length > 0) {
      content += `\n5. KHUYẾN NGHỊ CHUNG CHO NHÀ TRƯỜNG:\n`;
      aiReport.generalSolutions.forEach(s => {
        content += `  * ${s}\n`;
      });
    }
    navigator.clipboard.writeText(content);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Map tên giáo viên nhanh
  const teacherMap = new Map<string, string>();
  teachersList.forEach(t => {
    const id = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
    const name = String(t['Họ và tên (*)'] || t['Tên GV'] || t['Họ và tên'] || '').trim();
    if (id) teacherMap.set(id, name || id);
  });

  // Map tên môn học nhanh
  const subjectMap = new Map<string, string>();
  subjectsList.forEach(s => {
    const id = String(s['Mã Môn (*)'] || s['Mã Môn'] || '').trim();
    const name = String(s['Tên Môn (*)'] || s['Tên Môn'] || '').trim();
    if (id) subjectMap.set(id, name || id);
  });

  const renderScheduleGrid = (filterFn: (item: ScheduleItem) => boolean) => {
    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    const filteredItems = schedule.filter(filterFn);

    return (
      <div className="schedule-grid">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="th-period">Tiết / Thứ</th>
              {days.map(d => <th key={d} className="th-day">Thứ {d}</th>)}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => {
              const isAfternoon = p > 5;
              const displayPeriod = isAfternoon ? p - 5 : p;
              return (
                <tr key={p} className={p === 6 ? 'afternoon-divider' : ''}>
                  <td className="th-period">
                    Tiết {displayPeriod}
                    <br/><small>{isAfternoon ? '(Chiều)' : '(Sáng)'}</small>
                  </td>
                  {days.map(d => {
                    const item = filteredItems.find(i => i.day === d && i.period === p);
                    return (
                      <td key={`${d}-${p}`}>
                        {item ? (
                          <div className="cell-content">
                            {(viewMode === 'Giáo viên' || viewMode === 'Tổ') ? (
                              <>
                                <span className="cell-subject">{item.classId}</span>
                                <div className="cell-details">
                                  <span>{subjectMap.get(item.subjectId) || item.subjectId}</span>
                                  {item.roomId && <span className="room-badge">{item.roomId}</span>}
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="cell-subject">{subjectMap.get(item.subjectId) || item.subjectId}</span>
                                {viewMode === 'Lớp' && (
                                  <div className="cell-details">
                                    <span>{teacherMap.get(item.teacherId) || item.teacherId}</span>
                                    {item.teacherId && teacherMap.has(item.teacherId) && (
                                      <small className="teacher-sub-id">({item.teacherId})</small>
                                    )}
                                    {item.roomId && <span className="room-badge">{item.roomId}</span>}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="empty-cell">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const filteredClasses = classesList.filter(c => {
    if (schoolSearchClass && !c.toLowerCase().includes(schoolSearchClass.toLowerCase().trim())) {
      return false;
    }
    if (schoolFilterGrade !== 'Tất cả') {
      if (!c.startsWith(schoolFilterGrade)) return false;
    }
    return true;
  });


  const renderNewSchoolWideGrid = () => {
    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5];

    return (
      <div className="school-matrix-container new-layout">
        <div className="school-filter-bar">
          <div className="filter-item">
            <label>Khối lớp:</label>
            <select 
              className="view-select compact"
              value={schoolFilterGrade}
              onChange={e => setSchoolFilterGrade(e.target.value)}
            >
              <option value="Tất cả">Tất cả các khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>
          <div className="filter-item search-item">
            <label>Tìm kiếm:</label>
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text"
                placeholder="Nhập tên lớp (vd: 6A1)..."
                value={schoolSearchClass}
                onChange={e => setSchoolSearchClass(e.target.value)}
                className="view-input"
              />
            </div>
          </div>
          <div className="filter-item" style={{ marginLeft: 'auto' }}>
            <button className="glass-button primary-btn" onClick={() => exportTimetableToExcel(schedule, classesList, teachersList, subjectsList)}>
              <FileSpreadsheet size={18} style={{ marginRight: '6px' }} />
              Xuất Excel
            </button>
          </div>
        </div>

        <div className="school-table-wrapper">
          <table className="school-schedule-table new-school-table">
            <thead>
              <tr className="tr-header-group">
                <th rowSpan={2} className="th-fixed th-school-day">THỨ</th>
                <th rowSpan={2} className="th-fixed th-school-period">TIẾT</th>
                {filteredClasses.map(c => (
                  <th key={c} colSpan={2} className="th-class-title">{c}</th>
                ))}
              </tr>
              <tr className="tr-sub-header">
                {filteredClasses.map(c => (
                  <React.Fragment key={`sub-${c}`}>
                    <th className="th-sub-session">Sáng</th>
                    <th className="th-sub-session">Chiều</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={2 + filteredClasses.length * 2} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                days.map((day) => {
                  const dayLabel = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][day] || `Thứ ${day}`;
                  const totalRows = periods.length;
                  
                  return (
                    <React.Fragment key={`day-${day}`}>
                      {periods.map((p, pIndex) => {
                        const isLastPeriodOfDay = pIndex === periods.length - 1;
                        return (
                          <tr key={`day-${day}-p-${p}`} className={isLastPeriodOfDay ? 'day-divider' : ''}>
                            {pIndex === 0 && (
                              <td rowSpan={totalRows} className="td-day-span">
                                {dayLabel}
                              </td>
                            )}
                            <td className="td-period-span">{p}</td>
                            
                            {filteredClasses.map(c => {
                              const itemSang = schedule.find(s => s.classId === c && s.day === day && s.period === p);
                              const itemChieu = schedule.find(s => s.classId === c && s.day === day && s.period === p + 5);

                              const renderCell = (item: any) => {
                                if (!item) return <td className="cell-new-empty"></td>;
                                const teacherId = String(item.teacherId || '').trim();
                                const teacherName = teacherMap.get(teacherId) || teacherId;
                                const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;
                                
                                return (
                                  <td className="cell-new-content">
                                    <div className="new-subject">{subjectDisplayName}</div>
                                    <div className="new-teacher" title={teacherName}>{teacherName}</div>
                                    {item.roomId && <div className="new-room">{item.roomId}</div>}
                                  </td>
                                );
                              };

                              return (
                                <React.Fragment key={`${c}-${day}-${p}`}>
                                  {renderCell(itemSang)}
                                  {renderCell(itemChieu)}
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSchoolWideGrid = () => {
    const days = [2, 3, 4, 5, 6, 7];

    const allSessions = [
      { name: 'SANG', label: 'Sáng', periods: [1, 2, 3, 4, 5], actualPeriods: [1, 2, 3, 4, 5] },
      { name: 'TRUA', label: 'Trưa', periods: [1], actualPeriods: [0] },
      { name: 'CHIEU', label: 'Chiều', periods: [1, 2, 3, 4, 5], actualPeriods: [6, 7, 8, 9, 10] }
    ];

    const activeSessions = allSessions.filter(s => {
      if (schoolFilterSession === 'Tất cả') return true;
      return s.name === schoolFilterSession;
    });

    let rowIndex = 0;

    return (
      <div className="school-matrix-container">
        <div className="school-filter-bar">
          <div className="filter-item">
            <label>Khối lớp:</label>
            <select 
              className="view-select compact"
              value={schoolFilterGrade}
              onChange={e => setSchoolFilterGrade(e.target.value)}
            >
              <option value="Tất cả">Tất cả các khối</option>
              <option value="6">Khối 6</option>
              <option value="7">Khối 7</option>
              <option value="8">Khối 8</option>
              <option value="9">Khối 9</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Buổi học:</label>
            <select 
              className="view-select compact"
              value={schoolFilterSession}
              onChange={e => setSchoolFilterSession(e.target.value)}
            >
              <option value="Tất cả">Tất cả các buổi</option>
              <option value="SANG">Sáng</option>
              <option value="CHIEU">Chiều</option>
            </select>
          </div>

          <div className="filter-item search-item">
            <label>Tìm kiếm:</label>
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text"
                placeholder="Nhập tên lớp (vd: 6A1)..."
                value={schoolSearchClass}
                onChange={e => setSchoolSearchClass(e.target.value)}
                className="view-input"
              />
            </div>
          </div>
        </div>

        <div className="school-table-wrapper">
          <table className="school-schedule-table">
            <thead>
              <tr className="tr-header-group">
                <th rowSpan={2} className="th-fixed th-stt">#</th>
                <th rowSpan={2} className="th-fixed th-class">Lớp</th>
                <th rowSpan={2} className="th-fixed th-session">Mã buổi</th>
                <th rowSpan={2} className="th-fixed th-period">Tiết</th>
                {days.map(d => (
                  <th key={d} colSpan={2} className="th-day-title">Thứ {d}</th>
                ))}
              </tr>
              <tr className="tr-sub-header">
                {days.map(d => (
                  <React.Fragment key={d}>
                    <th className="th-sub-subject">Môn học</th>
                    <th className="th-sub-teacher">Giáo viên</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Không tìm thấy lớp học nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((classId) => {
                  return activeSessions.map((session) => {
                    return session.periods.map((displayPeriod, pIdx) => {
                      const actualPeriod = session.actualPeriods[pIdx];
                      rowIndex++;
                      const isLastOfClass = session.name === activeSessions[activeSessions.length - 1].name && pIdx === session.periods.length - 1;

                      return (
                        <tr 
                          key={`${classId}-${session.name}-${displayPeriod}`}
                          className={`${isLastOfClass ? 'row-class-divider' : ''} ${session.name === 'TRUA' ? 'row-trua' : ''}`}
                        >
                          <td className="td-fixed td-stt">{rowIndex}</td>
                          <td className="td-fixed td-class font-bold">{classId}</td>
                          <td className="td-fixed td-session">{session.name}</td>
                          <td className="td-fixed td-period">{displayPeriod}</td>

                          {days.map(day => {
                            const item = schedule.find(
                              s => s.classId === classId && s.day === day && s.period === actualPeriod
                            );

                            if (item) {
                              const teacherId = String(item.teacherId || '').trim();
                              const teacherName = teacherMap.get(teacherId) || teacherId;
                              const subjectDisplayName = subjectMap.get(item.subjectId) || item.subjectId;

                              return (
                                <React.Fragment key={`${day}-${classId}-${actualPeriod}`}>
                                  <td className="cell-school-subject">{subjectDisplayName}</td>
                                  <td className="cell-school-teacher">
                                    <div className="teacher-block">
                                      <span className="teacher-name">{teacherName}</span>
                                      {teacherId && (
                                        <span className="teacher-code">({teacherId})</span>
                                      )}
                                    </div>
                                  </td>
                                </React.Fragment>
                              );
                            } else {
                              return (
                                <React.Fragment key={`${day}-${classId}-${actualPeriod}`}>
                                  <td className="cell-school-empty"></td>
                                  <td className="cell-school-empty"></td>
                                </React.Fragment>
                              );
                            }
                          })}
                        </tr>
                      );
                    });
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Tổng hợp đối soát chuyên môn toàn trường
  const teacherAuditList = useMemo(() => {
    return teachersList.map(teacher => {
      const teacherId = String(teacher['Mã GV (*)'] || teacher['Mã GV'] || '').trim();
      const teacherName = String(teacher['Họ và tên (*)'] || teacher['Tên GV'] || teacherId).trim();
      const dept = String(teacher['Tổ chuyên môn'] || '').trim();

      // Lấy danh sách phân công của GV này
      const teacherAssigns = rawAssignments.filter(a => {
        const id = String(a['Mã GV (*)'] || a['Mã GV'] || '').trim();
        const name = String(a['Tên GV'] || a['Tên GV (*)'] || a['Họ và tên'] || '').trim();
        return id === teacherId || (name && name === teacherName);
      });

      let totalAssignedPeriods = 0;
      const assignedDetails: string[] = [];

      teacherAssigns.forEach(a => {
        const subId = String(a['Mã Môn (*)'] || a['Mã Môn'] || '').trim();
        const subName = subjectMap.get(subId) || subId;
        const numPeriods = parseInt(a['Số tiết/tuần (*)']) || 0;
        const classes = String(a['Lớp (*)'] || '').split(/[,;\s]+/).map((c: string) => c.trim()).filter(Boolean);
        totalAssignedPeriods += numPeriods * classes.length;
        if (classes.length > 0) {
          assignedDetails.push(`${subName} (${classes.join(', ')}): ${numPeriods * classes.length} tiết`);
        }
      });

      // Đếm số tiết thực tế đã xếp trên TKB của GV này (chỉ tính tiết có phân công dạy lớp học)
      const scheduledItems = schedule.filter(s => s.teacherId === teacherId && s.classId);
      const scheduledCount = scheduledItems.length;
      const missingCount = Math.max(0, totalAssignedPeriods - scheduledCount);

      return {
        teacherId,
        teacherName,
        dept,
        totalAssignedPeriods,
        scheduledCount,
        missingCount,
        assignedDetails: assignedDetails.join(' | '),
        isMissing: missingCount > 0
      };
    }).filter(t => {
      if (auditOnlyMissing && !t.isMissing) return false;
      if (auditSearch) {
        const term = removeVietnameseTones(auditSearch);
        const nameNorm = removeVietnameseTones(t.teacherName);
        const idNorm = removeVietnameseTones(t.teacherId);
        const deptNorm = removeVietnameseTones(t.dept);
        return nameNorm.includes(term) || idNorm.includes(term) || deptNorm.includes(term);
      }
      return true;
    });
  }, [teachersList, rawAssignments, schedule, auditOnlyMissing, auditSearch, subjectMap]);

  // ======================= MODAL TKB LỚP / GIÁO VIÊN =======================
  const closeModal = useCallback(() => setModalTarget(null), []);

  useEffect(() => {
    if (!modalTarget) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [modalTarget, closeModal]);

  const renderTimetableModal = () => {
    if (!modalTarget) return null;

    const { type, id } = modalTarget;
    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const filteredItems = type === 'class'
      ? schedule.filter(s => s.classId === id)
      : schedule.filter(s => s.teacherId === id);

    // Thông tin hiển thị trên header
    let headerTitle = '';
    let headerSub = '';
    if (type === 'class') {
      headerTitle = `Thời Khóa Biểu Lớp ${id}`;
    } else {
      const teacherName = teacherMap.get(id) || id;
      const teacherObj = teachersList.find(t => {
        const tid = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
        return tid === id;
      });
      const dept = teacherObj ? String(teacherObj['Tổ chuyên môn'] || '').trim() : '';
      headerTitle = `Thời Khóa Biểu GV: ${teacherName}`;
      headerSub = `Mã GV: ${id}${dept ? ` · Tổ: ${dept}` : ''}`;
    }

    // Thống kê số tiết đã xếp (chỉ tính tiết có lớp/giáo viên thực tế)
    const totalScheduled = type === 'class'
      ? filteredItems.filter(s => s.teacherId).length
      : filteredItems.filter(s => s.classId).length;

    // Lọc các tiết bị kẹt liên quan đến lớp/GV đang xem
    const relatedUnassigned = unassignedLessons.filter(u =>
      type === 'class' ? u.classId === id : u.teacherId === id
    );
    const totalMissing = relatedUnassigned.reduce((s: number, u: any) => s + (u.size || 1), 0);

    return createPortal(
      <div className="tkb-modal-overlay" onClick={closeModal}>
        <div className="tkb-modal-container" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="tkb-modal-header">
            <div className="tkb-modal-header-info">
              <div className="tkb-modal-icon">
                {type === 'class' ? <Calendar size={24} /> : <Eye size={24} />}
              </div>
              <div>
                <h3 className="tkb-modal-title">{headerTitle}</h3>
                {headerSub && <p className="tkb-modal-subtitle">{headerSub}</p>}
              </div>
            </div>
            <div className="tkb-modal-header-right">
              <span className="tkb-modal-badge success-badge">✅ Đã xếp: {totalScheduled} tiết</span>
              {totalMissing > 0 && (
                <span className="tkb-modal-badge danger-badge">❌ Thiếu: {totalMissing} tiết</span>
              )}
              <button className="tkb-modal-close-btn" onClick={closeModal} title="Đóng">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Cảnh báo tiết bị kẹt */}
          {relatedUnassigned.length > 0 && (
            <div className="tkb-modal-warning-box">
              <div className="tkb-modal-warning-header">
                <AlertTriangle size={18} />
                <strong>Cảnh báo: {totalMissing} tiết chưa xếp được</strong>
              </div>
              <div className="tkb-modal-warning-list">
                {relatedUnassigned.map((u: any, idx: number) => (
                  <div key={idx} className="tkb-modal-warning-item">
                    <span className="badge-class">{u.classId}</span>
                    <strong>{u.subjectName || u.subjectId}</strong>
                    <span>— {u.teacherName || u.teacherId}</span>
                    <span className="tkb-modal-missing-count">{u.size || 1} tiết</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bảng TKB */}
          <div className="tkb-modal-grid-wrapper">
            <table className="schedule-table tkb-modal-table">
              <thead>
                <tr>
                  <th className="th-period">Tiết / Thứ</th>
                  {days.map(d => <th key={d} className="th-day">Thứ {d}</th>)}
                </tr>
              </thead>
              <tbody>
                {periods.map(p => {
                  const isAfternoon = p > 5;
                  const displayPeriod = isAfternoon ? p - 5 : p;
                  return (
                    <tr key={p} className={p === 6 ? 'afternoon-divider' : ''}>
                      <td className="th-period">
                        Tiết {displayPeriod}
                        <br/><small>{isAfternoon ? '(Chiều)' : '(Sáng)'}</small>
                      </td>
                      {days.map(d => {
                        const item = filteredItems.find(i => i.day === d && i.period === p);
                        return (
                          <td key={`${d}-${p}`}>
                            {item ? (
                              <div className="cell-content">
                                {type === 'teacher' ? (
                                  <>
                                    <span className="cell-subject">{item.classId}</span>
                                    <div className="cell-details">
                                      <span>{subjectMap.get(item.subjectId) || item.subjectId}</span>
                                      {item.roomId && <span className="room-badge">{item.roomId}</span>}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="cell-subject">{subjectMap.get(item.subjectId) || item.subjectId}</span>
                                    <div className="cell-details">
                                      <span>{teacherMap.get(item.teacherId) || item.teacherId}</span>
                                      {item.teacherId && teacherMap.has(item.teacherId) && (
                                        <small className="teacher-sub-id">({item.teacherId})</small>
                                      )}
                                      {item.roomId && <span className="room-badge">{item.roomId}</span>}
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="empty-cell">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="tkb-modal-footer">
            <button className="glass-button primary-btn" onClick={closeModal}>
              Đóng
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderAuditGrid = () => {
    const totalRequired = auditStats?.totalRequired || 0;
    const totalScheduled = auditStats?.scheduled || schedule.filter(s => s.teacherId && s.classId).length;
    const missingCount = unassignedLessons.length;
    const missingTeachersCount = teacherAuditList.filter(t => t.isMissing).length;

    const teacherAuditMap = new Map(teacherAuditList.map(t => [t.teacherId, t]));
    const currentActiveModel = getStoredAiModel();
    const currentActiveModelObj = AI_MODELS.find(m => m.id === currentActiveModel) || AI_MODELS[1];

    const liveCurriculumConflicts = auditAssignmentsAgainstCurriculum(rawAssignments);

    return (
      <div className="audit-section-container">
        {/* Thống kê thẻ Card */}
        <div className="audit-cards-grid">
          <div className="audit-card info">
            <div className="audit-card-icon"><BarChart3 size={28} /></div>
            <div className="audit-card-info">
              <span className="audit-card-label">Tổng tiết phân công</span>
              <strong className="audit-card-value">{totalRequired} <small>tiết</small></strong>
            </div>
          </div>

          <div className="audit-card success">
            <div className="audit-card-icon"><CheckCircle2 size={28} /></div>
            <div className="audit-card-info">
              <span className="audit-card-label">Đã xếp thành công</span>
              <strong className="audit-card-value">{totalScheduled} <small>tiết</small></strong>
            </div>
          </div>

          <div className={`audit-card ${missingCount > 0 ? 'danger' : 'neutral'}`}>
            <div className="audit-card-icon">
              {missingCount > 0 ? <AlertTriangle size={28} /> : <Check size={28} />}
            </div>
            <div className="audit-card-info">
              <span className="audit-card-label">Tiết chưa xếp được</span>
              <strong className="audit-card-value">{missingCount} <small>tiết ({missingTeachersCount} GV)</small></strong>
            </div>
            {missingCount > 0 && (
              <button
                className="audit-card-ai-btn"
                onClick={handleAnalyzeAiErrors}
                disabled={isAiAnalyzing}
                title="Bấm để AI phân tích nguyên nhân chưa xếp được"
              >
                {isAiAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{isAiAnalyzing ? 'Đang phân tích...' : 'AI Phân tích lỗi'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cảnh báo đặc biệt: Môn học bị phân công sai định mức chuẩn CT GDPT 2018 (VD: HĐTN 9/3 tiết) */}
        {liveCurriculumConflicts.length > 0 && (
          <div className="audit-curriculum-live-banner">
            <div className="curriculum-live-header">
              <div className="curriculum-live-title-group">
                <AlertOctagon size={24} className="icon-curriculum-live" />
                <div>
                  <h3 className="curriculum-live-title">
                    🚨 CẢNH BÁO: PHÁT HIỆN {liveCurriculumConflicts.length} MÔN HỌC BỊ PHÂN CÔNG SAI ĐỊNH MỨC CT GDPT 2018!
                  </h3>
                  <p className="curriculum-live-subtitle">
                    (Ví dụ: Môn Hoạt động trải nghiệm chuẩn 3 tiết/tuần nhưng được phân công 6 - 9 tiết do nhiều giáo viên cùng được gán số tiết lớn, gây quá tải lịch học)
                  </p>
                </div>
              </div>
              <button
                className="btn-ai-analyze-curriculum-quick"
                onClick={handleAnalyzeAiErrors}
                disabled={isAiAnalyzing}
              >
                <Sparkles size={16} />
                <span>AI Phân tích cách sửa</span>
              </button>
            </div>

            <div className="curriculum-live-table-wrapper">
              <table className="curriculum-live-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Lớp</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Khối</th>
                    <th style={{ width: '160px' }}>Môn học</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Phân công</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Chuẩn GDPT</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Chênh lệch</th>
                    <th>Giáo viên được gán & Nguyên nhân chi tiết</th>
                    <th style={{ minWidth: '220px' }}>Hướng dẫn khắc phục</th>
                  </tr>
                </thead>
                <tbody>
                  {liveCurriculumConflicts.map((c, cIdx) => (
                    <tr key={`live-curr-${cIdx}`} className={c.multiTeacherIssue ? 'row-multi-teacher-alert' : ''}>
                      <td><span className="badge-class">{c.classId}</span></td>
                      <td style={{ textAlign: 'center' }}>Khối {c.grade}</td>
                      <td><strong>{c.subjectDisplayName}</strong></td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: c.type === 'EXCESS' ? '#b91c1c' : '#d97706' }}>
                        {c.totalAssigned} tiết/tuần
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>
                        {c.standardRequired} tiết/tuần
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-status ${c.type === 'EXCESS' ? 'danger' : 'warning'}`}>
                          {c.diff > 0 ? `❌ Thừa ${c.diff}t` : `⚠️ Thiếu ${Math.abs(c.diff)}t`}
                        </span>
                        {c.multiTeacherIssue && (
                          <div className="badge-multi-teacher-tag">
                            🚨 Gán trùng {c.teachersDetail.length} GV
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="curr-detailed-cause">
                          {c.detailedCause}
                        </div>
                      </td>
                      <td>
                        <div className="curr-action-sol">
                          <Lightbulb size={13} className="inline-bulb" />
                          <span>{c.actionSolution}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cảnh báo chi tiết các tiết bị kẹt (nếu có) */}
        {unassignedLessons.length > 0 && (
          <div className="audit-unassigned-alert-box">
            <div className="alert-box-header">
              <div className="alert-box-header-title">
                <ShieldAlert size={22} className="alert-icon-red" />
                <h3>Danh sách chi tiết {unassignedLessons.length} tiết chưa xếp được vào Thời Khóa Biểu</h3>
              </div>
              <div className="alert-box-actions">
                <button
                  className="btn-ai-analyze-main"
                  onClick={handleAnalyzeAiErrors}
                  disabled={isAiAnalyzing}
                >
                  {isAiAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>AI Đang Phân Tích Lỗi...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Tìm lỗi bằng AI ({currentActiveModelObj.shortName})</span>
                    </>
                  )}
                </button>
                <button
                  className="btn-ai-config-icon"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  title="Cấu hình Google Gemini API Key & Model"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {isAiAnalyzing && (
              <div className="ai-analyzing-progress-bar">
                <Loader2 size={18} className="animate-spin" style={{ color: '#ea580c' }} />
                <span>Mô hình <strong>{currentActiveModelObj.name}</strong> đang phân tích đa chiều dữ liệu phân công, ràng buộc và lịch học để tìm nguyên nhân...</span>
              </div>
            )}

            {aiAnalysisError && (
              <div className="ai-analysis-error-banner">
                <div className="error-text">
                  <AlertCircle size={18} />
                  <span><strong>Lỗi phân tích AI:</strong> {aiAnalysisError}</span>
                </div>
                <div className="error-actions">
                  <button className="btn-retry" onClick={handleAnalyzeAiErrors}>Thử lại</button>
                  <button className="btn-reconfig" onClick={() => setIsApiKeyModalOpen(true)}>Đổi API Key / Model</button>
                </div>
              </div>
            )}

            <p className="alert-box-desc">
              Các tiết dưới đây chưa thể xếp do xung đột trùng lịch giữa giáo viên, lớp học hoặc phòng chức năng / ràng buộc nghỉ. Nhấn <strong>"Tìm lỗi bằng AI"</strong> để xem phân tích chi tiết nguyên nhân và hướng dẫn sửa cụ thể cho từng giáo viên:
            </p>
            <div className="audit-table-wrapper">
              <table className="audit-table unassigned-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Lớp</th>
                    <th>Môn học</th>
                    <th>Giáo viên phụ trách</th>
                    <th>Mã GV</th>
                    <th>Phân công chuyên môn</th>
                    <th>Số tiết thiếu</th>
                    <th style={{ minWidth: '320px' }}>Lý do & Hướng xử lý (Chi tiết AI)</th>
                    <th style={{ width: '180px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedLessons.map((item, idx) => {
                    const aiIssue = aiReport?.teacherIssues?.find(
                      issue => String(issue.teacherId).trim() === String(item.teacherId).trim() &&
                        (String(issue.classId).trim() === String(item.classId).trim() || !issue.classId)
                    );

                    return (
                      <tr key={`unassigned-${idx}`}>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <span
                            className="badge-class badge-class-clickable"
                            onClick={() => setModalTarget({ type: 'class', id: item.classId })}
                            title={`Xem TKB Lớp ${item.classId}`}
                          >
                            {item.classId}
                          </span>
                        </td>
                        <td><strong>{item.subjectName || item.subjectId}</strong></td>
                        <td>
                          <span
                            className="teacher-name-clickable"
                            onClick={() => setModalTarget({ type: 'teacher', id: item.teacherId })}
                            title={`Xem TKB GV ${item.teacherName}`}
                          >
                            {item.teacherName}
                          </span>
                        </td>
                        <td><code>{item.teacherId}</code></td>
                        <td className="assign-details-cell">
                          {teacherAuditMap.get(item.teacherId)?.assignedDetails || '-'}
                        </td>
                        <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{item.size || 1} tiết</td>
                        <td className="reason-cell">
                          {aiIssue ? (
                            <div className="ai-reason-item-box">
                              <div className="ai-reason-badge-tag">
                                <Sparkles size={12} />
                                <span>Phân tích {aiReport?.modelUsed}:</span>
                              </div>
                              <div className="ai-reason-cause">
                                <strong>🔍 Nguyên nhân:</strong> {aiIssue.rootCause}
                              </div>
                              <div className="ai-reason-solution">
                                <strong>💡 Cách sửa:</strong> {aiIssue.actionableSolution}
                              </div>
                            </div>
                          ) : (
                            <div className="default-reason-box">
                              <div className="default-reason-text">
                                {item.reason || 'Xung đột lịch trùng giữa Lớp, Giáo viên, Phòng học hoặc Ràng buộc nghỉ'}
                              </div>
                              {!isAiAnalyzing && (
                                <button
                                  type="button"
                                  className="btn-trigger-ai-inline"
                                  onClick={handleAnalyzeAiErrors}
                                  title="Phân tích chi tiết nguyên nhân bằng AI"
                                >
                                  <Sparkles size={12} />
                                  <span>AI Tìm lỗi</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="unassigned-actions">
                            <button
                              className="btn-quick-view btn-quick-class"
                              onClick={() => setModalTarget({ type: 'class', id: item.classId })}
                            >
                              Xem TKB Lớp
                            </button>
                            <button
                              className="btn-quick-view"
                              onClick={() => setModalTarget({ type: 'teacher', id: item.teacherId })}
                            >
                              Xem TKB GV
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Khung Báo Cáo Chẩn Đoán Chi Tiết Từ AI */}
        {aiReport && (
          <div className="ai-report-container">
            <div className="ai-report-header">
              <div className="ai-report-title-group">
                <div className="ai-report-icon-sparkle">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h4 className="ai-report-title">
                    BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN & HƯỚNG DẪN SỬA LỖI TỪ AI
                  </h4>
                  <p className="ai-report-subtitle">
                    Mô hình: <span className="badge-model-tag">{aiReport.modelUsed}</span> · Thời gian phân tích: {aiReport.timestamp}
                  </p>
                </div>
              </div>
              <div className="ai-report-header-actions">
                <button className="btn-report-action btn-copy-report" onClick={handleCopyReport}>
                  {copiedReport ? <CheckCheck size={15} color="#15803d" /> : <Copy size={15} />}
                  <span>{copiedReport ? 'Đã sao chép giải pháp!' : 'Sao chép giải pháp'}</span>
                </button>
                <button className="btn-report-action btn-reanalyze" onClick={handleAnalyzeAiErrors} disabled={isAiAnalyzing}>
                  <RefreshCw size={15} className={isAiAnalyzing ? 'animate-spin' : ''} />
                  <span>Phân tích lại</span>
                </button>
                <button className="btn-report-action btn-config" onClick={() => setIsApiKeyModalOpen(true)}>
                  <Settings size={15} />
                  <span>Đổi Model/Key</span>
                </button>
              </div>
            </div>

            {/* Tóm tắt nguyên nhân chung */}
            <div className="ai-report-summary-box">
              <div className="summary-header">
                <Lightbulb size={18} className="summary-bulb-icon" />
                <strong>TỔNG QUAN NGUYÊN NHÂN NGHẼN LỊCH:</strong>
              </div>
              <p className="summary-content">{aiReport.summary}</p>
            </div>

            {/* Cảnh báo Sai lệch Định mức chuẩn CT GDPT 2018 (nếu phát hiện) */}
            {aiReport.curriculumConflicts && aiReport.curriculumConflicts.length > 0 && (
              <div className="ai-curriculum-conflicts-box">
                <div className="curriculum-conflicts-header">
                  <AlertOctagon size={20} className="icon-curriculum-alert" />
                  <strong>🚨 PHÁT HIỆN {aiReport.curriculumConflicts.length} MÔN HỌC BỊ PHÂN CÔNG SAI ĐỊNH MỨC CT GDPT 2018 (BỘ GD&ĐT):</strong>
                </div>
                <p className="curriculum-conflicts-desc">
                  Đây là nguyên nhân chính khiến tổng số tiết/tuần của lớp vượt quá số buổi học hoặc làm giáo viên bị quá tải. Vui lòng vào tab <strong>"Phân công"</strong> điều chỉnh lại:
                </p>
                <div className="curriculum-conflicts-table-wrapper">
                  <table className="curriculum-conflicts-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Lớp</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Khối</th>
                        <th style={{ width: '160px' }}>Môn học</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Phân công</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Chuẩn GDPT</th>
                        <th style={{ width: '130px', textAlign: 'center' }}>Chênh lệch</th>
                        <th>Giáo viên được gán & Nguyên nhân chi tiết</th>
                        <th style={{ minWidth: '220px' }}>Hướng dẫn khắc phục</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiReport.curriculumConflicts.map((c, cIdx) => (
                        <tr key={`curriculum-conflict-${cIdx}`} className={c.multiTeacherIssue ? 'row-multi-teacher-alert' : ''}>
                          <td><span className="badge-class">{c.classId}</span></td>
                          <td style={{ textAlign: 'center' }}>Khối {c.grade}</td>
                          <td><strong>{c.subjectDisplayName}</strong></td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: c.type === 'EXCESS' ? '#b91c1c' : '#d97706' }}>
                            {c.totalAssigned} tiết/tuần
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#15803d' }}>
                            {c.standardRequired} tiết/tuần
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge-status ${c.type === 'EXCESS' ? 'danger' : 'warning'}`}>
                              {c.diff > 0 ? `❌ Thừa ${c.diff}t` : `⚠️ Thiếu ${Math.abs(c.diff)}t`}
                            </span>
                            {c.multiTeacherIssue && (
                              <div className="badge-multi-teacher-tag">
                                🚨 Gán trùng {c.teachersDetail.length} GV
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="curr-detailed-cause">
                              {c.detailedCause}
                            </div>
                          </td>
                          <td>
                            <div className="curr-action-sol">
                              <Lightbulb size={13} className="inline-bulb" />
                              <span>{c.actionSolution}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Báo Cáo Đối Soát Lỗi Chi Tiết Theo Từng Lớp Học */}
            {aiReport.classIssues && aiReport.classIssues.some(c => c.isOverCapacity || c.hasCurriculumError) && (
              <div className="ai-class-audit-section">
                <h5 className="ai-cards-list-title">
                  🏫 BÁO CÁO ĐỐI SOÁT PHÂN CÔNG & DUNG LƯỢNG THEO TỪNG LỚP HỌC:
                </h5>
                <div className="ai-class-cards-grid">
                  {aiReport.classIssues
                    .filter(c => c.isOverCapacity || c.hasCurriculumError)
                    .map((cIssue, cIdx) => (
                      <div 
                        key={`class-issue-card-${cIdx}`} 
                        className={`ai-class-issue-card ${cIssue.isOverCapacity ? 'over-capacity' : 'curriculum-error'}`}
                      >
                        <div className="class-card-top">
                          <div className="class-card-left">
                            <span className="class-badge-lg">{cIssue.classId}</span>
                            <div>
                              <div className="class-grade-session">
                                <strong>Khối {cIssue.grade}</strong> · <span>{cIssue.sessionType}</span>
                              </div>
                              <div className="class-capacity-text">
                                Sức chứa: <strong>{cIssue.maxWeeklyCapacity} tiết/tuần</strong> ({cIssue.daysCount} ngày)
                              </div>
                            </div>
                          </div>
                          <div className="class-card-right">
                            <span className={`badge-class-load ${cIssue.isOverCapacity ? 'danger' : 'warning'}`}>
                              Phân công: {cIssue.totalAssignedPeriods}/{cIssue.maxWeeklyCapacity}t
                              {cIssue.isOverCapacity && ` (🚨 Thừa ${cIssue.capacityDiff}t)`}
                            </span>
                            <button
                              className="btn-view-class-tkb"
                              onClick={() => setModalTarget({ type: 'class', id: cIssue.classId })}
                            >
                              Xem TKB Lớp
                            </button>
                          </div>
                        </div>

                        {/* Danh sách các môn của lớp */}
                        <div className="class-subjects-table-mini-wrapper">
                          <table className="class-subjects-table-mini">
                            <thead>
                              <tr>
                                <th>Môn học</th>
                                <th style={{ textAlign: 'center' }}>Số tiết</th>
                                <th style={{ textAlign: 'center' }}>Chuẩn GDPT</th>
                                <th>Trạng thái & Giáo viên</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cIssue.subjectDetails.map((sub, sIdx) => (
                                <tr key={`cls-sub-${sIdx}`} className={sub.status !== 'OK' ? 'row-sub-error' : ''}>
                                  <td><strong>{sub.subjectDisplayName}</strong></td>
                                  <td style={{ textAlign: 'center', fontWeight: 700, color: sub.status === 'EXCESS' ? '#b91c1c' : sub.status === 'DEFICIT' ? '#d97706' : '#15803d' }}>
                                    {sub.assignedPeriods}t
                                  </td>
                                  <td style={{ textAlign: 'center', color: '#64748b' }}>
                                    {sub.standardPeriods}t
                                  </td>
                                  <td>
                                    <div className="sub-status-teachers">
                                      {sub.status === 'EXCESS' && <span className="tag-err excess">❌ Thừa {sub.diff}t</span>}
                                      {sub.status === 'DEFICIT' && <span className="tag-err deficit">⚠️ Thiếu {Math.abs(sub.diff)}t</span>}
                                      {sub.status === 'OK' && <span className="tag-err ok">✓ Đủ</span>}
                                      <span className="sub-teachers-str">
                                        GV: {sub.teachers.map(t => `${t.teacherName} (${t.periods}t)`).join(', ')}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Hướng dẫn sửa cho Lớp */}
                        <div className="class-solution-box">
                          <Lightbulb size={15} className="solution-icon" />
                          <p className="solution-text"><strong>Hướng xử lý:</strong> {cIssue.actionSolution}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Danh sách thẻ phân tích chi tiết từng Giáo viên */}
            <div className="ai-teacher-cards-list">
              <h5 className="ai-cards-list-title">
                📋 CHI TIẾT TỪNG TRƯỜNG HỢP GIÁO VIÊN BỊ KẸT TIẾT ({aiReport.teacherIssues.length} GV):
              </h5>
              <div className="ai-cards-grid">
                {aiReport.teacherIssues.map((issue, iIdx) => (
                  <div key={`ai-issue-card-${iIdx}`} className="ai-teacher-issue-card">
                    <div className="issue-card-top">
                      <div className="issue-teacher-info">
                        <span className="issue-index">#{iIdx + 1}</span>
                        <strong className="issue-teacher-name">{issue.teacherName}</strong>
                        <code className="issue-teacher-id">({issue.teacherId})</code>
                        <span className="issue-class-badge">Lớp {issue.classId}</span>
                        <span className="issue-sub-badge">{issue.subjectName}</span>
                      </div>
                      <span className="issue-missing-tag">Thiếu {issue.missingPeriods} tiết</span>
                    </div>

                    <div className="issue-card-content">
                      <div className="issue-cause-block">
                        <div className="block-label red">
                          <AlertOctagon size={15} /> <strong>Nguyên nhân xung đột tại phân công:</strong>
                        </div>
                        <p className="block-text">{issue.rootCause}</p>
                      </div>

                      <div className="issue-solution-block">
                        <div className="block-label green">
                          <Lightbulb size={15} /> <strong>Hướng dẫn sửa lại cụ thể:</strong>
                        </div>
                        <p className="block-text">{issue.actionableSolution}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Khuyến nghị tổng thể */}
            {aiReport.generalSolutions && aiReport.generalSolutions.length > 0 && (
              <div className="ai-general-solutions-box">
                <h5>📌 KHUYẾN NGHỊ TỐI ƯU HÓA CHUNG CHO NHÀ TRƯỜNG:</h5>
                <ul>
                  {aiReport.generalSolutions.map((sol, sIdx) => (
                    <li key={sIdx}>{sol}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Bảng đối soát chi tiết toàn bộ giáo viên */}
        <div className="audit-main-box">
          <div className="audit-filter-bar">
            <div className="search-box audit-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên giáo viên, mã GV, tổ bộ môn..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="view-input"
              />
            </div>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={auditOnlyMissing}
                onChange={e => setAuditOnlyMissing(e.target.checked)}
              />
              <span>Chỉ hiện giáo viên bị thiếu tiết</span>
            </label>
          </div>

          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>STT</th>
                  <th>Mã GV</th>
                  <th>Họ và tên Giáo viên</th>
                  <th>Tổ chuyên môn</th>
                  <th>Phân công chuyên môn</th>
                  <th style={{ width: '90px' }}>YC (Tiết)</th>
                  <th style={{ width: '90px' }}>Đã xếp</th>
                  <th style={{ width: '90px' }}>Thiếu</th>
                  <th style={{ width: '130px' }}>Trạng thái</th>
                  <th style={{ width: '110px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {teacherAuditList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Không tìm thấy giáo viên nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  teacherAuditList.map((t, idx) => (
                    <tr key={t.teacherId} className={t.isMissing ? 'row-missing' : ''}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td><code>{t.teacherId}</code></td>
                      <td><strong>{t.teacherName}</strong></td>
                      <td>{t.dept || '-'}</td>
                      <td className="assign-details-cell">{t.assignedDetails || '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.totalAssignedPeriods}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: t.isMissing ? '#d97706' : '#16a34a' }}>
                        {t.scheduledCount}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: t.isMissing ? '#ef4444' : '#64748b' }}>
                        {t.missingCount > 0 ? `-${t.missingCount}` : '0'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {t.isMissing ? (
                          <span className="badge-status danger">❌ Thiếu {t.missingCount} tiết</span>
                        ) : (
                          <span className="badge-status success">✅ Đủ 100%</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-quick-view"
                          onClick={() => setModalTarget({ type: 'teacher', id: t.teacherId })}
                        >
                          Xem TKB GV
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const exportDeptTimetableToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const { saveAs } = await import('file-saver');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TKB Pro';
    workbook.created = new Date();

    const days = [2, 3, 4, 5, 6, 7];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const thinBorder: any = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    departmentsList.forEach(deptName => {
      const deptTeachers = teachersList.filter(t => {
        const dept = String(t['Tổ chuyên môn'] || '').trim();
        return dept === deptName;
      });
      if (deptTeachers.length === 0) return;

      // Tên sheet tối đa 31 ký tự
      const sheetTitle = deptName.length > 31 ? deptName.substring(0, 31) : deptName;
      const sheet = workbook.addWorksheet(sheetTitle, {
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });

      sheet.columns = [
        { header: '', key: 'period', width: 12 },
        { header: '', key: 'day2', width: 20 },
        { header: '', key: 'day3', width: 20 },
        { header: '', key: 'day4', width: 20 },
        { header: '', key: 'day5', width: 20 },
        { header: '', key: 'day6', width: 20 },
        { header: '', key: 'day7', width: 20 },
      ];

      let currentRow = 1;

      // Tiêu đề tổ
      const deptTitleRow = sheet.getRow(currentRow);
      deptTitleRow.getCell(1).value = `TKB TỔ: ${deptName}`;
      deptTitleRow.getCell(1).font = { name: 'Times New Roman', size: 18, bold: true, color: { argb: 'FF7C3AED' } };
      deptTitleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.mergeCells(currentRow, 1, currentRow, 7);
      deptTitleRow.height = 35;
      currentRow += 2;

      deptTeachers.forEach((teacher, tIdx) => {
        const teacherId = String(teacher['Mã GV (*)'] || teacher['Mã GV'] || '').trim();
        const teacherName = String(teacher['Họ và tên (*)'] || teacher['Tên GV'] || teacherId).trim();
        const teacherItems = schedule.filter(s => s.teacherId === teacherId);

        // Tiêu đề GV
        const titleRow = sheet.getRow(currentRow);
        titleRow.getCell(1).value = `${teacherName} (${teacherId})`;
        titleRow.getCell(1).font = { name: 'Times New Roman', size: 14, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.mergeCells(currentRow, 1, currentRow, 7);
        titleRow.height = 28;
        currentRow++;

        // Header
        const headerRow = sheet.getRow(currentRow);
        headerRow.values = ['Tiết \\ Thứ', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        headerRow.font = { name: 'Times New Roman', size: 11, bold: true };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 24;
        for (let i = 1; i <= 7; i++) {
          headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
          headerRow.getCell(i).border = thinBorder;
        }
        currentRow++;

        // Tiết
        periods.forEach(p => {
          const row = sheet.getRow(currentRow);
          const isAfternoon = p > 5;
          const displayPeriod = isAfternoon ? p - 5 : p;

          const periodCell = row.getCell(1);
          periodCell.value = `Tiết ${displayPeriod}\n(${isAfternoon ? 'Chiều' : 'Sáng'})`;
          periodCell.font = { name: 'Times New Roman', size: 10, bold: true };
          periodCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          periodCell.border = thinBorder;

          days.forEach((d, index) => {
            const colIndex = index + 2;
            const cell = row.getCell(colIndex);
            const item = teacherItems.find(i => i.day === d && i.period === p);

            if (item) {
              const subName = subjectMap.get(item.subjectId) || item.subjectId;
              const richText: any[] = [
                { font: { bold: true, name: 'Times New Roman', size: 11 }, text: item.classId + '\n' },
                { font: { name: 'Times New Roman', size: 10 }, text: subName }
              ];
              if (item.roomId) {
                richText.push({ font: { name: 'Times New Roman', size: 9, color: { argb: 'FF0EA5E9' } }, text: '\n' + item.roomId });
              }
              cell.value = { richText };
            } else {
              cell.value = '-';
              cell.font = { name: 'Times New Roman', size: 11, color: { argb: 'FF999999' } };
            }

            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = thinBorder;
          });

          row.height = 42;

          if (p === 5) {
            for (let i = 1; i <= 7; i++) {
              row.getCell(i).border = { ...thinBorder, bottom: { style: 'medium' } };
            }
          }

          currentRow++;
        });

        currentRow += 2;

        if (tIdx < deptTeachers.length - 1) {
          sheet.getRow(currentRow - 3).addPageBreak();
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `TKB_Theo_To_${new Date().getTime()}.xlsx`);
  };

  const exportJSON = () => {
    if (schedule.length === 0) return;
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TKB_Backup_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setOldScheduleBaseline(data);
          alert('Đã tải TKB cũ thành công! Lần xếp TKB tiếp theo sẽ cố gắng giữ nguyên khung này.');
        } else {
          alert('File JSON không hợp lệ!');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <div>
          <h2>Xếp Thời Khóa Biểu</h2>
          <p>Tự động sinh lịch học dựa trên phân công chuyên môn và các ràng buộc</p>
        </div>
        {schedule.length > 0 && (
          <div className="export-actions">
            <button className="glass-button secondary-btn" onClick={() => exportTimetableToWord(schedule, classesList, teachersList, 'Lớp')}>
              Xuất Word (TKB Lớp)
            </button>
            <button className="glass-button secondary-btn" onClick={() => exportTimetableToWord(schedule, classesList, teachersList, 'Giáo viên')}>
              Xuất Word (TKB Giáo viên)
            </button>
            <button className="glass-button primary-btn" onClick={() => exportTimetableToExcel(schedule, classesList, teachersList, subjectsList)}>
              <FileSpreadsheet size={18} style={{ marginRight: '6px' }} />
              Xuất Excel toàn trường
            </button>
          </div>
        )}
      </div>

      <button 
        className="start-btn" 
        onClick={handleGenerate}
        disabled={isGenerating}
        style={{ marginBottom: '12px' }}
      >
        <Play size={24} fill="currentColor" />
        {isGenerating ? generateStatus || 'Đang phân tích & Xếp lịch...' : 'Bắt đầu Xếp TKB'}
      </button>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
         <button 
            className="glass-button btn-orange" 
            onClick={exportJSON} 
            disabled={schedule.length === 0}
            style={{ padding: '8px 16px', fontWeight: 'bold' }}
         >
            Lưu bản sao lưu TKB (JSON)
         </button>
         <label 
            className="glass-button btn-green" 
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0, fontWeight: 'bold' }}
         >
            UP BẢN SAO LƯU TKB (JSON)
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJSON} />
         </label>
         {oldScheduleBaseline && (
            <span style={{ color: '#059669', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
               <Check size={16} style={{ marginRight: '4px' }}/>
               Đã tải khung TKB cũ. Nhấn Bắt đầu Xếp TKB để áp dụng.
            </span>
         )}
      </div>

      {auditStats && (
        <div className={`audit-summary-banner ${unassignedLessons.length === 0 ? 'success' : 'warning'}`}>
          <div className="audit-banner-left">
            {unassignedLessons.length === 0 ? (
              <CheckCircle2 size={24} className="audit-icon-success" />
            ) : (
              <AlertTriangle size={24} className="audit-icon-warning" />
            )}
            <div>
              <h4 className="audit-banner-title">
                {unassignedLessons.length === 0 
                  ? `ĐÃ XẾP ĐỦ 100% TIẾT THEO PHÂN CÔNG (${auditStats.scheduled}/${auditStats.totalRequired} tiết)`
                  : `CẢNH BÁO: CÒN ${unassignedLessons.length} TIẾT CHƯA XẾP ĐƯỢC (Đã xếp ${auditStats.scheduled}/${auditStats.totalRequired} tiết)`}
              </h4>
              <p className="audit-banner-desc">
                {unassignedLessons.length === 0
                  ? 'Toàn bộ các tiết phân công của tất cả giáo viên và lớp học đã được xếp lịch đầy đủ.'
                  : 'Phát hiện có tiết bị xung đột lịch / phòng bộ môn / ràng buộc nghỉ. Bấm nút Tìm lỗi bằng AI để hệ thống phân tích chi tiết cho từng giáo viên.'}
              </p>
            </div>
          </div>
          <div className="audit-banner-actions">
            {unassignedLessons.length > 0 && (
              <button
                className="glass-button btn-ai-banner-analyze"
                onClick={() => {
                  setViewMode('Đối soát phân công');
                  handleAnalyzeAiErrors();
                }}
                disabled={isAiAnalyzing}
              >
                {isAiAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>{isAiAnalyzing ? 'AI Đang Phân Tích...' : '✨ Tìm lỗi bằng AI'}</span>
              </button>
            )}
            <button 
              className="glass-button audit-view-btn"
              onClick={() => setViewMode('Đối soát phân công')}
            >
              📊 Bảng Đối soát phân công
            </button>
          </div>
        </div>
      )}

      {schedule.length > 0 && (
        <div className="timetable-results">
          <div className="timetable-tabs">
            {(['Toàn trường', 'Toàn trường CSDL', 'Lớp', 'Giáo viên', 'Tổ', 'Đối soát phân công'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`tt-tab-btn ${viewMode === mode ? 'active' : ''} ${mode === 'Đối soát phân công' && unassignedLessons.length > 0 ? 'tab-btn-warning' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'Đối soát phân công' ? (
                  <>
                    📊 Đối soát phân công
                    {unassignedLessons.length > 0 && (
                      <span className="tab-warning-badge">{unassignedLessons.length}</span>
                    )}
                  </>
                ) : (
                  `TKB ${mode}`
                )}
              </button>
            ))}
          </div>

          <div className="view-content">
            {viewMode === 'Toàn trường' && renderNewSchoolWideGrid()}
            {viewMode === 'Toàn trường CSDL' && renderSchoolWideGrid()}
            {viewMode === 'Đối soát phân công' && renderAuditGrid()}

            {viewMode === 'Lớp' && (
              <>
                <div className="view-controls">
                  <label className="view-control-label">Chọn Lớp học:</label>
                  <SearchableSelect 
                    options={classesList.map(c => ({
                      value: c,
                      label: `Lớp ${c}`
                    }))}
                    value={selectedClass}
                    onChange={(val) => setSelectedClass(val)}
                    placeholder="Gõ tên lớp để tìm nhanh..."
                  />
                </div>
                {selectedClass && renderScheduleGrid(item => item.classId === selectedClass)}
              </>
            )}

            {viewMode === 'Giáo viên' && (
              <>
                <div className="view-controls">
                  <label className="view-control-label">Chọn Giáo viên:</label>
                  <SearchableSelect 
                    options={teachersList.map(t => {
                      const id = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
                      const name = String(t['Họ và tên (*)'] || t['Tên GV'] || id).trim();
                      return {
                        value: id,
                        label: name,
                        subLabel: id !== name ? id : undefined
                      };
                    })}
                    value={selectedTeacher}
                    onChange={(val) => setSelectedTeacher(val)}
                    placeholder="Gõ tên hoặc mã GV để tìm nhanh..."
                  />
                </div>
                {selectedTeacher && renderScheduleGrid(item => item.teacherId === selectedTeacher)}
              </>
            )}

            {viewMode === 'Tổ' && (
              <>
                <div className="view-controls" style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <label className="view-control-label">Chọn Tổ chuyên môn:</label>
                    <SearchableSelect 
                      options={departmentsList.map(d => ({
                        value: d,
                        label: d
                      }))}
                      value={selectedDepartment}
                      onChange={(val) => setSelectedDepartment(val)}
                      placeholder="Gõ tên tổ để tìm nhanh..."
                    />
                  </div>
                  <button 
                    className="glass-button primary-btn"
                    style={{ height: '42px', whiteSpace: 'nowrap' }}
                    onClick={() => exportDeptTimetableToExcel()}
                  >
                    <FileSpreadsheet size={18} style={{ marginRight: '6px' }} />
                    Xuất Excel tất cả Tổ
                  </button>
                </div>
                {selectedDepartment && (() => {
                  const deptTeachers = teachersList.filter(t => {
                    const dept = String(t['Tổ chuyên môn'] || '').trim();
                    return dept === selectedDepartment;
                  });
                  if (deptTeachers.length === 0) {
                    return (
                      <div className="empty-state">
                        <AlertCircle size={48} />
                        <h3>Không có giáo viên nào trong tổ này</h3>
                      </div>
                    );
                  }
                  return (
                    <div className="dept-teachers-list">
                      {deptTeachers.map(t => {
                        const id = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
                        const name = String(t['Họ và tên (*)'] || t['Tên GV'] || id).trim();
                        return (
                          <div key={id} className="dept-teacher-block" style={{ marginBottom: '32px' }}>
                            <h3 style={{ 
                              fontSize: '15px', 
                              fontWeight: 600, 
                              color: 'var(--text-primary)', 
                              marginBottom: '12px',
                              padding: '10px 16px',
                              background: 'var(--bg-secondary, #f1f5f9)',
                              borderRadius: '8px',
                              borderLeft: '4px solid var(--primary, #7c3aed)'
                            }}>
                              📋 {name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '13px' }}>({id})</span>
                            </h3>
                            {renderScheduleGrid(item => item.teacherId === id)}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {schedule.length === 0 && !isGenerating && (
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Chưa có dữ liệu TKB</h3>
          <p>Hãy bấm nút Bắt đầu ở trên để hệ thống tự động xếp lịch.</p>
        </div>
      )}

      {/* Vùng ẩn dành cho in ấn PDF (Chỉ hiện khi Print) */}
      <div className="printable-area">
        {/* In TKB Lớp */}
        {classesList.map((classId) => (
          <div key={`print-class-${classId}`} className="print-page">
            <h2 className="print-title">THỜI KHÓA BIỂU LỚP: {classId}</h2>
            {renderScheduleGrid(item => item.classId === classId)}
          </div>
        ))}
        {/* In TKB Giáo viên */}
        {teachersList.map((teacher) => {
          const teacherId = teacher['Mã GV (*)'] || teacher['Mã GV'];
          const teacherName = teacher['Họ và tên (*)'] || teacher['Tên GV'] || teacherId;
          return (
            <div key={`print-teacher-${teacherId}`} className="print-page">
              <h2 className="print-title">THỜI KHÓA BIỂU GIÁO VIÊN: {teacherName} ({teacherId})</h2>
              {renderScheduleGrid(item => item.teacherId === teacherId)}
            </div>
          );
        })}
      </div>

      {/* Modal Popup xem TKB Lớp / Giáo viên */}
      {renderTimetableModal()}

      {/* Modal Cấu hình Google Gemini API */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSaved={(_newKey, _newModel) => {
          setIsApiKeyModalOpen(false);
          // Tự động kích hoạt phân tích ngay sau khi lưu key thành công nếu đang có tiết thiếu
          if (unassignedLessons.length > 0) {
            handleAnalyzeAiErrors();
          }
        }}
      />
    </div>
  );
}
