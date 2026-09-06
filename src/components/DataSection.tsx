import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, Download, FileSpreadsheet, Plus, Trash2, CloudUpload } from 'lucide-react';
import { parseExcelSheet, exportTemplate } from '../utils/excel';
import { saveToCloud, loadFromCloud } from '../utils/cloudApi';
import { getUserItem, setUserItem } from '../utils/userStorage';
import './DataSection.css';

interface DataSectionProps {
  title: string;
  sheetName: string;
}

const normalizeRows = (rows: any[], sheetName: string) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row: any) => {
    if (sheetName === 'Ràng buộc') {
      if (!row['Quy tắc (*)'] || !String(row['Quy tắc (*)']).trim()) {
        row['Quy tắc (*)'] = 'Cứng';
      }
      if (!row['Buổi (*)'] || !String(row['Buổi (*)']).trim()) {
        const tiet = String(row['Tiết (*)'] || '');
        const hasAfternoon = tiet.split(/[,;\s]+/).some(p => {
          const n = parseInt(p);
          return !isNaN(n) && n >= 6;
        });
        row['Buổi (*)'] = hasAfternoon ? 'Chiều' : 'Sáng';
      }
    }
    return row;
  });
};

const TEMPLATES: Record<string, any[]> = {
  'Lớp học': [
    {'Mã Lớp (*)': '6A1', 'Khối (*)': 6, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '1,2,3,4,5', 'Tiết học Chiều (*)': ''},
    {'Mã Lớp (*)': '6A2', 'Khối (*)': 6, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '1,2,3,4,5', 'Tiết học Chiều (*)': ''},
    {'Mã Lớp (*)': '8A1', 'Khối (*)': 8, 'Ngày học (*)': '2,3,4,5,6', 'Tiết học Sáng (*)': '', 'Tiết học Chiều (*)': '1,2,3,4,5'},
    {'Mã Lớp (*)': '9A1', 'Khối (*)': 9, 'Ngày học (*)': '2,3,4,5,6,7', 'Tiết học Sáng (*)': '', 'Tiết học Chiều (*)': '1,2,3,4,5'}
  ],
  'Phòng học': [
    {'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_1', 'Tên Phòng (*)': 'Phòng tin 1', 'GV Cố định': 'Nguyễn Phi Hùng (7913698240)'},
    {'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_2', 'Tên Phòng (*)': 'Phòng tin 2', 'GV Cố định': 'Nguyễn Thị Lý (7904801482)'},
    {'Mã Loại Phòng (*)': 'PHONG_TIN', 'Mã Phòng Cụ Thể (*)': 'TIN_3', 'Tên Phòng (*)': 'Phòng tin 3', 'GV Cố định': 'Phạm Nguyên Hưng (7900570373)'}
  ],
  'Môn học': [
    {'Mã Môn (*)': 'TOAN', 'Tên Môn (*)': 'Toán học', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
    {'Mã Môn (*)': 'VAN', 'Tên Môn (*)': 'Ngữ văn', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
    {'Mã Môn (*)': 'ANH', 'Tên Môn (*)': 'Tiếng Anh', 'Yêu cầu phòng đặc biệt': '', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
    {'Mã Môn (*)': 'KHTN', 'Tên Môn (*)': 'Khoa học tự nhiên', 'Yêu cầu phòng đặc biệt': 'PHONG_TH_LY', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Có'},
    {'Mã Môn (*)': 'TIN', 'Tên Môn (*)': 'Tin học', 'Yêu cầu phòng đặc biệt': 'PHONG_TIN', 'Số tiết kép tối đa': 2, 'Độ khó / Yêu cầu giãn cách': 'Không'}
  ],
  'Giáo viên': [
    {'Mã GV (*)': 'GV_01', 'Họ và tên (*)': 'Nguyễn Văn A', 'Tổ chuyên môn': 'Toán - Tin', 'Ràng buộc thời gian (Nghỉ cố định)': 'S2, C5', 'Số tiết định mức tối đa/ngày': 4},
    {'Mã GV (*)': 'GV_02', 'Họ và tên (*)': 'Trần Thị B', 'Tổ chuyên môn': 'Văn - KHXH', 'Ràng buộc thời gian (Nghỉ cố định)': '', 'Số tiết định mức tối đa/ngày': 4},
    {'Mã GV (*)': 'GV_03', 'Họ và tên (*)': 'Lê Văn C', 'Tổ chuyên môn': 'KHTN', 'Ràng buộc thời gian (Nghỉ cố định)': 'S7', 'Số tiết định mức tối đa/ngày': 4},
    {'Mã GV (*)': 'GV_04', 'Họ và tên (*)': 'Phạm Thị D', 'Tổ chuyên môn': 'Ngoại ngữ', 'Ràng buộc thời gian (Nghỉ cố định)': '', 'Số tiết định mức tối đa/ngày': 4},
    {'Mã GV (*)': 'GV_05', 'Họ và tên (*)': 'Hoàng Văn E', 'Tổ chuyên môn': 'Thể chất', 'Ràng buộc thời gian (Nghỉ cố định)': '', 'Số tiết định mức tối đa/ngày': 4}
  ],
  'GVCN': [
    {'Họ và tên (*)': 'Nguyễn Văn A (GV_01)', 'Lớp Chủ nhiệm (*)': '6A1'},
    {'Họ và tên (*)': 'Trần Thị B (GV_02)', 'Lớp Chủ nhiệm (*)': '6A2'},
    {'Họ và tên (*)': 'Lê Văn C (GV_03)', 'Lớp Chủ nhiệm (*)': '8A1'}
  ],
  'Phân công': [
    {'Mã GV (*)': 'GV_01', 'Tên GV': 'Nguyễn Văn A', 'Mã Môn (*)': 'TOAN', 'Lớp (*)': '6A1, 6A2', 'Số tiết/tuần (*)': 4},
    {'Mã GV (*)': 'GV_02', 'Tên GV': 'Trần Thị B', 'Mã Môn (*)': 'VAN', 'Lớp (*)': '6A1', 'Số tiết/tuần (*)': 4},
    {'Mã GV (*)': 'GV_03', 'Tên GV': 'Lê Văn C', 'Mã Môn (*)': 'KHTN', 'Lớp (*)': '6A1, 6A2', 'Số tiết/tuần (*)': 4},
    {'Mã GV (*)': 'GV_04', 'Tên GV': 'Phạm Thị D', 'Mã Môn (*)': 'ANH', 'Lớp (*)': '7A1', 'Số tiết/tuần (*)': 3},
    {'Mã GV (*)': 'GV_05', 'Tên GV': 'Hoàng Văn E', 'Mã Môn (*)': 'GDTC', 'Lớp (*)': '6A1, 7A1', 'Số tiết/tuần (*)': 2}
  ],
  'Ràng buộc': [
    {'Đối tượng': 'Tất cả các lớp', 'Thứ (*)': 2, 'Buổi (*)': 'Sáng', 'Tiết (*)': '1', 'Nội dung ghim / Cấm': 'Chào cờ', 'Quy tắc (*)': 'Cứng'},
    {'Đối tượng': 'Tất cả các lớp', 'Thứ (*)': 6, 'Buổi (*)': 'Chiều', 'Tiết (*)': '5', 'Nội dung ghim / Cấm': 'Sinh hoạt lớp', 'Quy tắc (*)': 'Cứng'},
    {'Đối tượng': 'Toán - Tin', 'Thứ (*)': 5, 'Buổi (*)': 'Sáng', 'Tiết (*)': '1,2,3', 'Nội dung ghim / Cấm': 'Họp chuyên môn', 'Quy tắc (*)': 'Cứng'},
    {'Đối tượng': 'GV_01', 'Thứ (*)': 3, 'Buổi (*)': 'Sáng', 'Tiết (*)': '1,2', 'Nội dung ghim / Cấm': 'Bồi dưỡng HSG Toán', 'Quy tắc (*)': 'Mềm'},
    {'Đối tượng': 'Ngoại ngữ', 'Thứ (*)': 4, 'Buổi (*)': 'Chiều', 'Tiết (*)': '4,5', 'Nội dung ghim / Cấm': 'Họp chuyên môn', 'Quy tắc (*)': 'Mềm'}
  ]
};

export function DataSection({ title, sheetName }: DataSectionProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizeRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest('th');
    const startWidth = th ? th.getBoundingClientRect().width : 150;
    resizeRef.current = { col, startX: e.clientX, startWidth };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = ev.clientX - resizeRef.current.startX;
      const newWidth = Math.max(60, resizeRef.current.startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizeRef.current!.col]: newWidth }));
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);
  
  // Headers depend on the template if data is empty, but we should always include template headers
  // to ensure new columns (like Quy tắc, Buổi) appear even for old data from Cloud.
  const templateHeaders = Object.keys(TEMPLATES[sheetName]?.[0] || {});
  const dataHeaders = data.length > 0 ? Object.keys(data[0]) : [];
  // Gộp cả 2 để không bị mất cột mới thêm vào Template
  const rawHeaders = Array.from(new Set([...templateHeaders, ...dataHeaders]));
  const headers = rawHeaders.filter(h => h !== 'Tài khoản' && h !== 'Thời gian');

  // Tự động đồng bộ data vào user storage theo tài khoản mỗi khi có thay đổi
  useEffect(() => {
    if (data !== undefined && data !== null) {
      setUserItem(`data_${sheetName}`, JSON.stringify(data));
    }
  }, [data, sheetName]);

  useEffect(() => {
    // 1. Tải trước từ cache riêng của user hiện tại (nếu có)
    try {
      const local = getUserItem(`data_${sheetName}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          setData(normalizeRows(parsed, sheetName));
        } else {
          setData([]);
        }
      } else {
        // Tài khoản mới chưa có dữ liệu: Không hiển thị dữ liệu của tài khoản khác
        setData([]);
      }
    } catch(e) {
      setData([]);
    }

    // 2. Tải dữ liệu từ cloud của tài khoản này
    const initData = async () => {
      setCloudLoading(true);
      setCloudMessage(null);
      
      try {
        const cloudData = await loadFromCloud(sheetName);
        if (Array.isArray(cloudData)) {
          if (cloudData.length > 0) {
            const normalized = normalizeRows(cloudData, sheetName);
            setData(normalized);
            setUserItem(`data_${sheetName}`, JSON.stringify(normalized));
          } else {
            // Tài khoản mới hoặc sheet chưa có dữ liệu của tài khoản này:
            // Đặt data = [] để tuyệt đối không hiển thị dữ liệu cũ của tài khoản khác
            setData([]);
            setUserItem(`data_${sheetName}`, JSON.stringify([]));
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Không thể kết nối")) {
           setCloudMessage({ type: 'error', text: err.message });
        }
      }

      if (sheetName === 'Phân công') {
         try {
           let classData: any[] = [];
           try {
             const local = getUserItem('data_Lớp học');
             if (local) classData = JSON.parse(local);
           } catch(e) {}
           if (!classData || classData.length === 0) {
             classData = await loadFromCloud('Lớp học').catch(() => []);
           }
           if (classData && Array.isArray(classData)) {
              const cls = classData.map((r: any) => r['Mã Lớp (*)'] || r['Mã Lớp'] || r['Tên Lớp (*)'] || r['Tên Lớp']).filter(Boolean);
              setClassOptions([...new Set(cls)] as string[]);
           }
         } catch(e) { console.error("Lỗi lấy Lớp học:", e); }
         
         try {
           let subjectData: any[] = [];
           try {
             const local = getUserItem('data_Môn học');
             if (local) subjectData = JSON.parse(local);
           } catch(e) {}
           if (!subjectData || subjectData.length === 0) {
             subjectData = await loadFromCloud('Môn học').catch(() => []);
           }
           if (subjectData && Array.isArray(subjectData)) {
              const sub = subjectData.map((r: any) => r['Mã Môn (*)'] || r['Mã Môn'] || r['Tên Môn (*)'] || r['Tên Môn']).filter(Boolean);
              setSubjectOptions([...new Set(sub)] as string[]);
           }
         } catch(e) { console.error("Lỗi lấy Môn học:", e); }
      }

      if (sheetName === 'Phòng học' || sheetName === 'GVCN') {
         try {
           let teacherData: any[] = [];
           try {
             const local = getUserItem('data_Giáo viên');
             if (local) teacherData = JSON.parse(local);
           } catch(e) {}
           if (!teacherData || teacherData.length === 0) {
             teacherData = await loadFromCloud('Giáo viên').catch(() => []);
           }

           let assignData: any[] = [];
           try {
             const localAssign = getUserItem('data_Phân công');
             if (localAssign) assignData = JSON.parse(localAssign);
           } catch(e) {}
           if (!assignData || assignData.length === 0) {
             assignData = await loadFromCloud('Phân công').catch(() => []);
           }

           const teacherMap = new Map<string, string>();

           if (Array.isArray(teacherData)) {
             teacherData.forEach((r: any) => {
               const id = String(r['Mã GV (*)'] || r['Mã GV'] || r['Mã giáo viên'] || r['MaGV'] || r['ID'] || '').trim();
               const name = String(r['Họ và tên (*)'] || r['Họ và tên'] || r['Tên GV (*)'] || r['Tên GV'] || r['Tên'] || r['Họ tên'] || id).trim();
               if (id) teacherMap.set(id, name || id);
             });
           }

           if (Array.isArray(assignData)) {
             assignData.forEach((a: any) => {
               const id = String(a['Mã GV (*)'] || a['Mã GV'] || a['Mã giáo viên'] || a['MaGV'] || '').trim();
               const name = String(a['Tên GV'] || a['Tên GV (*)'] || a['Họ và tên'] || '').trim();
               if (id && (!teacherMap.has(id) || (name && teacherMap.get(id) === id))) {
                 teacherMap.set(id, name || id);
               }
             });
           }

           const list = Array.from(teacherMap.entries()).map(([id, name]) => {
             if (name && id && name !== id) {
               return `${name} (${id})`;
             }
             return name || id;
           }).sort((a, b) => a.localeCompare(b, 'vi'));

           setTeacherOptions(list);
         } catch(e) { console.error("Lỗi lấy Giáo viên:", e); }
      }
      
      setCloudLoading(false);
    };
    initData();
  }, [sheetName]);

  const handleSaveToCloud = async () => {
    setCloudLoading(true);
    setCloudMessage(null);
    try {
      // Đảm bảo dữ liệu gửi đi chứa đầy đủ tất cả các cột đang hiển thị trên bảng
      // (Bao gồm cả những cột mới thêm vào Template mà dữ liệu cũ chưa có)
      const completeData = data.map(row => {
        const newRow: any = {};
        headers.forEach(h => {
          if (sheetName === 'Ràng buộc' && h === 'Quy tắc (*)') {
             newRow[h] = row[h] ? row[h] : 'Cứng';
          } else {
             newRow[h] = row[h] !== undefined ? row[h] : '';
          }
        });
        return newRow;
      });

      await saveToCloud(sheetName, completeData);
      setCloudMessage({ type: 'success', text: `Đã lưu ${data.length} dòng dữ liệu lên Google Sheet thành công!` });
      setTimeout(() => setCloudMessage(null), 5000); // Ẩn thông báo sau 5s
    } catch (err: any) {
      setCloudMessage({ type: 'error', text: err.message });
    } finally {
      setCloudLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (data.length > 0) {
      exportTemplate(sheetName, data);
    } else {
      const sample = TEMPLATES[sheetName] || [];
      exportTemplate(sheetName, sample);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleLoadSampleTemplate = () => {
    if (data.length > 0 && !window.confirm("Bảng hiện tại đang có dữ liệu. Bạn có chắc chắn muốn nạp dữ liệu mẫu thay thế không?")) {
      return;
    }
    const sample = TEMPLATES[sheetName] || [];
    const normalized = normalizeRows(sample, sheetName);
    setData(normalized);
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const jsonData = await parseExcelSheet(file, sheetName);
      const normalized = normalizeRows(jsonData, sheetName);
      setData(normalized);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đọc file.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddRow = () => {
    const newRow: any = {};
    headers.forEach(h => {
      if (sheetName === 'Ràng buộc' && h === 'Quy tắc (*)') {
        newRow[h] = 'Cứng';
      } else if (sheetName === 'Ràng buộc' && h === 'Buổi (*)') {
        newRow[h] = 'Sáng';
      } else {
        newRow[h] = '';
      }
    });
    setData([...data, newRow]);
  };

  const handleCellChange = (rowIndex: number, column: string, value: string) => {
    const newData = [...data];
    newData[rowIndex][column] = value;
    setData(newData);
  };

  const handleDeleteRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  const MultiSelectDropdown = ({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedItems = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
  
    const toggleItem = (item: string) => {
      let newItems;
      if (selectedItems.includes(item)) {
        newItems = selectedItems.filter(i => i !== item);
      } else {
        newItems = [...selectedItems, item];
      }
      onChange(newItems.join(', '));
    };
  
    return (
      <div className="multi-select-container">
        <div className="multi-select-trigger" onClick={() => setIsOpen(!isOpen)}>
          <span className={selectedItems.length > 0 ? "has-value" : "is-empty"}>
            {selectedItems.length > 0 ? selectedItems.join(', ') : placeholder}
          </span>
          <span className="dropdown-arrow">▼</span>
        </div>
        {isOpen && (
          <>
            <div className="dropdown-overlay" onClick={() => setIsOpen(false)}></div>
            <div className="multi-select-dropdown">
              {options.length === 0 ? (
                <div className="no-options">Chưa có dữ liệu từ Cloud</div>
              ) : (
                options.map(opt => (
                  <label key={opt} className="multi-select-option">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.includes(opt)}
                      onChange={() => toggleItem(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  };

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

  const SingleSearchableDropdown = ({
    options,
    value,
    onChange,
    placeholder = "Chọn hoặc gõ tên GV..."
  }: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = React.useMemo(() => {
      const trimmed = searchTerm.trim();
      if (!trimmed) return options;
      
      const termRaw = trimmed.toLowerCase();
      const termNoTone = removeVietnameseTones(trimmed);
      const searchWords = termNoTone.split(/\s+/).filter(Boolean);

      return options.filter(opt => {
        const optRaw = String(opt || '').toLowerCase();
        const optNoTone = removeVietnameseTones(opt);

        if (optRaw.includes(termRaw) || optNoTone.includes(termNoTone)) {
          return true;
        }

        if (searchWords.length > 0) {
          const matchAll = searchWords.every(w => optNoTone.includes(w) || optRaw.includes(w));
          if (matchAll) return true;
        }

        return false;
      });
    }, [options, searchTerm]);

    const handleSelect = (val: string) => {
      onChange(val === '__NONE__' ? '' : val);
      setIsOpen(false);
      setSearchTerm('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return (
      <div className="single-search-select-container">
        <div 
          className="single-search-select-trigger" 
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
        >
          <span className={value ? "has-value" : "is-empty"}>
            {value || placeholder}
          </span>
          <span className="dropdown-arrow">▼</span>
        </div>

        {isOpen && (
          <>
            <div className="dropdown-overlay" onClick={() => setIsOpen(false)}></div>
            <div className="single-search-select-dropdown">
              <div className="search-input-box" onClick={e => e.stopPropagation()}>
                <input 
                  ref={inputRef}
                  type="text"
                  className="dropdown-search-field"
                  placeholder="Gõ tên hoặc mã GV để tìm..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    className="clear-search-mini"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="options-scroll-list">
                <div 
                  className={`single-option-item unassign-option ${!value ? 'selected' : ''}`}
                  onClick={() => handleSelect('__NONE__')}
                >
                  <em>-- Không cố định (Dùng chung) --</em>
                </div>

                {filteredOptions.length === 0 ? (
                  <div className="no-options">Không tìm thấy giáo viên nào</div>
                ) : (
                  filteredOptions.map(opt => (
                    <div 
                      key={opt}
                      className={`single-option-item ${opt === value ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt)}
                    >
                      <span>{opt}</span>
                      {opt === value && <span className="selected-check">✓</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="data-section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Quản lý {title}</h1>
          <p className="section-subtitle">Tải lên file Excel hoặc nhập trực tiếp dữ liệu vào bảng dưới đây.</p>
          {sheetName === 'Giáo viên' && (
            <div className="hint-box" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
               💡 <strong>Mẹo nhập Nghỉ cố định:</strong><br/>
               - <strong>Nghỉ cả buổi / cả ngày:</strong> Dùng <strong>S</strong> (Sáng), <strong>C</strong> (Chiều), <strong>T</strong> (Cả ngày) kèm thứ (2-7). VD: <code>S2</code> (nghỉ sáng T2), <code>C5</code> (nghỉ chiều T5), <code>T7</code> (nghỉ cả ngày T7).<br/>
               - <strong>Nghỉ tiết cụ thể buổi Sáng:</strong> Ghi <code>3.1, 3.2</code> hoặc <code>S3.1, S3.2</code> (nghỉ sáng Thứ 3 tiết 1, 2).<br/>
               - <strong>Nghỉ tiết cụ thể buổi Chiều:</strong> Thêm chữ <strong>C</strong> như <code>C3.1, C3.2</code> hoặc <code>3.C1, 3.C2</code> (nghỉ chiều Thứ 3 tiết 1, 2) hoặc ghi theo <code>3.6, 3.7</code>.<br/>
               - Ngăn cách nhiều mục bằng dấu phẩy. VD: <code>S2, C5, C3.1, C3.2</code>.
            </div>
          )}
          {sheetName === 'Phòng học' && (
            <div className="hint-box" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
               💡 <strong>Nhập mã phòng giống y chang như mã phòng bên mục MÔN HỌC.</strong><br/>
               - <strong>GV Cố định:</strong> Chọn giáo viên phụ trách phòng (nếu có) để hệ thống tự xếp đúng phòng và chống trùng lịch. Nếu phòng dùng chung cho nhiều GV, chọn <em>-- Không cố định (Dùng chung) --</em>.
            </div>
          )}
          {sheetName === 'Lớp học' && (
            <div className="hint-box" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
               💡 <strong>Cấu hình Tiết học:</strong><br/>
               - Ngày học (*): Nhập các thứ cách nhau bởi dấu phẩy. VD: <code>2,3,4,5,6,7</code><br/>
               - Tiết học Sáng (*): Nhập các tiết học buổi sáng. VD: <code>1,2,3,4,5</code><br/>
               - Tiết học Chiều (*): Nhập các tiết học buổi chiều. VD: <code>6,7,8,9,10</code>
            </div>
          )}
          {sheetName === 'Ràng buộc' && (
            <div className="hint-box" style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
               💡 <strong>Cấu hình Ràng buộc linh hoạt:</strong><br/>
               - <strong>Buổi (*):</strong> Chọn <em>Sáng</em>, <em>Chiều</em> hoặc <em>Cả ngày</em>.<br/>
               - <strong>Tiết (*):</strong> Bạn chỉ cần gõ <code>1, 2, 3, 4, 5</code> (cho cả Sáng và Chiều, không cần phải gõ 6, 7, 8, 9, 10). Hệ thống sẽ tự động quy đổi theo Buổi.<br/>
               - <em>(Hỗ trợ thêm: Bạn cũng có thể gõ trực tiếp <code>C1, C2, C3</code> hoặc <code>S1, S2</code> vào ô Tiết).</em>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="glass-button secondary-btn header-btn" 
            onClick={handleLoadSampleTemplate}
            title="Nạp dữ liệu mẫu thử nghiệm vào bảng"
          >
            <FileSpreadsheet size={18} />
            <span>Nạp mẫu demo</span>
          </button>
          <button 
            className="glass-button cloud-btn header-btn" 
            onClick={handleSaveToCloud} 
            disabled={cloudLoading}
          >
            <CloudUpload size={18} />
            <span>{cloudLoading ? 'Đang xử lý...' : 'Lưu dữ liệu'}</span>
          </button>
          <button className="glass-button primary-btn header-btn" onClick={handleExportExcel}>
            <Download size={18} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {cloudMessage && (
        <div className={`cloud-message ${cloudMessage.type} glass-card`}>
          {cloudMessage.text}
        </div>
      )}

      <div 
        className="upload-area glass-card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
        />
        <UploadCloud size={48} className="upload-icon" />
        <h3>Nhấn hoặc kéo thả file Excel vào đây</h3>
        <p>Dữ liệu sẽ được tự động đọc từ Sheet <b>"{sheetName}"</b></p>
      </div>

      {error && (
        <div className="error-message glass-card">
          {error}
        </div>
      )}

      {loading && <div className="loading">Đang xử lý file...</div>}

      <div className="table-wrapper glass-card">
        <div className="table-header">
          <h3>
            <FileSpreadsheet size={20} /> 
            Dữ liệu hệ thống ({data.length} dòng)
          </h3>
        </div>
        <div className="glass-table-container">
          <table className="glass-table editable" ref={tableRef}>
            <thead>
              <tr>
                <th className="row-num">STT</th>
                {headers.map(h => (
                  <th key={h} className="resizable-th" style={columnWidths[h] ? { width: `${columnWidths[h]}px`, minWidth: `${columnWidths[h]}px` } : undefined}>
                    <span className="th-text">{h}</span>
                    <div
                      className="col-resize-handle"
                      onMouseDown={(e) => handleResizeMouseDown(e, h)}
                      title="Kéo để thay đổi độ rộng cột"
                    />
                  </th>
                ))}
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="row-num">{i + 1}</td>
                  {headers.map(h => {
                    if (h === 'Buổi học (*)') {
                      const val = row[h] || '';
                      const isSang = val.includes('Sáng');
                      const isChieu = val.includes('Chiều');
                      
                      const toggleShift = (shift: 'Sáng' | 'Chiều') => {
                        let newSang = isSang;
                        let newChieu = isChieu;
                        if (shift === 'Sáng') newSang = !isSang;
                        if (shift === 'Chiều') newChieu = !isChieu;
                        
                        const parts = [];
                        if (newSang) parts.push('Sáng');
                        if (newChieu) parts.push('Chiều');
                        handleCellChange(i, h, parts.join(', '));
                      };

                      return (
                        <td key={`${i}-${h}`}>
                          <div className="shift-cell">
                            <label className="shift-checkbox">
                              <input type="checkbox" checked={isSang} onChange={() => toggleShift('Sáng')} /> Sáng
                            </label>
                            <label className="shift-checkbox">
                              <input type="checkbox" checked={isChieu} onChange={() => toggleShift('Chiều')} /> Chiều
                            </label>
                          </div>
                        </td>
                      );
                    }
                    
                    if (sheetName === 'Phân công' && (h === 'Mã Môn (*)' || h === 'Lớp (*)')) {
                      const options = h === 'Mã Môn (*)' ? subjectOptions : classOptions;
                      return (
                        <td key={`${i}-${h}`} className="relative-cell">
                          <MultiSelectDropdown 
                            options={options}
                            value={row[h] || ''}
                            onChange={(val) => handleCellChange(i, h, val)}
                            placeholder={`Chọn ${h}...`}
                          />
                        </td>
                      );
                    }

                    if (sheetName === 'Ràng buộc' && h === 'Buổi (*)') {
                      return (
                        <td key={`${i}-${h}`}>
                          <select 
                            className="glass-input" 
                            value={row[h] || 'Sáng'}
                            onChange={(e) => handleCellChange(i, h, e.target.value)}
                            style={{ minWidth: '95px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            <option value="Sáng">Sáng</option>
                            <option value="Chiều">Chiều</option>
                            <option value="Cả ngày">Cả ngày</option>
                          </select>
                        </td>
                      );
                    }

                    if (sheetName === 'Ràng buộc' && h === 'Quy tắc (*)') {
                      return (
                        <td key={`${i}-${h}`}>
                          <select 
                            className="glass-input" 
                            value={row[h] || 'Cứng'}
                            onChange={(e) => handleCellChange(i, h, e.target.value)}
                            style={{ minWidth: '100px', cursor: 'pointer' }}
                          >
                            <option value="Cứng">Cứng (Bắt buộc)</option>
                            <option value="Mềm">Mềm (Ưu tiên)</option>
                          </select>
                        </td>
                      );
                    }
                    
                    if ((sheetName === 'Phòng học' && h === 'GV Cố định') || (sheetName === 'GVCN' && h === 'Họ và tên (*)')) {
                      return (
                        <td key={`${i}-${h}`} className="relative-cell">
                          <SingleSearchableDropdown
                            options={teacherOptions}
                            value={row[h] || ''}
                            onChange={(val) => handleCellChange(i, h, val)}
                            placeholder="Chọn hoặc gõ tên GV..."
                          />
                        </td>
                      );
                    }

                    let placeholder = `Nhập ${h}...`;
                    if (h === 'Ràng buộc thời gian (Nghỉ cố định)') placeholder = 'VD: S2, C5, T7...';
                    else if (h === 'Ngày học (*)') placeholder = 'VD: 2,3,4,5,6';
                    else if (h === 'Tiết học Sáng (*)') placeholder = 'VD: 1,2,3,4,5';
                    else if (h === 'Tiết học Chiều (*)') placeholder = 'VD: 6,7,8,9,10';
                    else if (sheetName === 'Ràng buộc' && h === 'Tiết (*)') placeholder = 'VD: 1,2,3,4,5 hoặc 1, 2...';

                    return (
                      <td key={`${i}-${h}`}>
                        <input 
                          type="text" 
                          value={row[h] || ''} 
                          onChange={(e) => handleCellChange(i, h, e.target.value)}
                          placeholder={placeholder}
                          title={h === 'Ràng buộc thời gian (Nghỉ cố định)' ? 'S: Sáng, C: Chiều, T: Cả ngày. Kèm theo thứ 2-7. VD: S2, C5' : ''}
                        />
                      </td>
                    );
                  })}
                  <td className="action-col">
                    <button className="delete-row-btn" onClick={() => handleDeleteRow(i)} title="Xóa dòng này">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 2} className="empty-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                      Tài khoản của bạn chưa có dữ liệu ở mục <strong>{title}</strong>.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button type="button" className="glass-button add-row-btn" onClick={handleAddRow} style={{ padding: '6px 14px' }}>
                        <Plus size={15} /> Thêm dòng mới
                      </button>
                      <button type="button" className="glass-button" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 14px' }}>
                        <UploadCloud size={15} /> Nhập từ Excel
                      </button>
                      <button type="button" className="glass-button" onClick={handleLoadSampleTemplate} style={{ padding: '6px 14px' }}>
                        <FileSpreadsheet size={15} /> Nạp dữ liệu mẫu
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-actions">
          <button className="glass-button add-row-btn" onClick={handleAddRow}>
            <Plus size={16} />
            <span>Thêm dòng mới</span>
          </button>
        </div>
      </div>
      {sheetName === 'Phòng học' && (
        <datalist id="teacher-options-list">
          {teacherOptions.map(t => <option key={t} value={t} />)}
        </datalist>
      )}
    </div>
  );
}
