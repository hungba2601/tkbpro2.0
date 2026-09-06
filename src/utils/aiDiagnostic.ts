// =========================================================================
// AI DIAGNOSTIC SERVICE CHO THỜI KHÓA BIỂU (GOOGLE GEMINI API)
// =========================================================================
import { getUserItem } from './userStorage';

export interface AiModelOption {
  id: string;
  name: string;
  shortName: string;
  label: string;
  description: string;
  isDefault?: boolean;
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    shortName: 'Gemini 3.5 Flash',
    label: 'Gemini 3.5 Flash (Tốc độ cao & Phản hồi tức thì)',
    description: 'Tốc độ cao, phản hồi nhanh chóng cho các bài toán phân bổ lịch tiêu chuẩn.'
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    shortName: 'Gemini 3.6 Flash',
    label: 'Gemini 3.6 Flash (Khuyên dùng - Chuẩn tối ưu & Ổn định)',
    description: 'Mặc định - Cân bằng hoàn hảo giữa tốc độ & chất lượng',
    isDefault: true
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    shortName: 'Gemini 3.7 Flash',
    label: 'Gemini 3.7 Flash (Mới nhất - Suy luận nâng cao & Sáng tạo)',
    description: 'Mới nhất - Suy luận nâng cao & Sáng tạo, xử lý xung đột ràng buộc đa tầng phức tạp.'
  }
];

const LOCAL_STORAGE_KEY_API_KEY = 'tkb_gemini_api_key';
const LOCAL_STORAGE_KEY_MODEL = 'tkb_gemini_model';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_API_KEY, key.trim());
  } catch (e) {
    console.error('Không thể lưu API Key vào localStorage:', e);
  }
}

export function getStoredAiModel(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_MODEL);
    if (saved && AI_MODELS.some(m => m.id === saved)) {
      return saved;
    }
  } catch {}
  return 'gemini-3.6-flash';
}

export function setStoredAiModel(modelId: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_MODEL, modelId);
  } catch (e) {
    console.error('Không thể lưu Model vào localStorage:', e);
  }
}

// =========================================================================
// QUY ĐỊNH SỐ TIẾT CHUẨN CÁC MÔN HỌC THEO CHƯƠNG TRÌNH GDPT 2018 (BỘ GD&ĐT)
// Áp dụng cho: Cấp Tiểu học (Khối 1-5), THCS (Khối 6-9), THPT (Khối 10-12)
// =========================================================================
export interface SubjectStandardCurriculum {
  name: string;
  periods: number;
  note?: string;
}

export const GDPT_2018_STANDARDS: Record<number, Record<string, SubjectStandardCurriculum>> = {
  // --- CẤP TIỂU HỌC (Khối 1 -> Khối 5) ---
  1: {
    'tiengviet': { name: 'Tiếng Việt', periods: 12, note: '420 tiết/năm' },
    'toan': { name: 'Toán', periods: 3, note: '105 tiết/năm' },
    'daoduc': { name: 'Đạo đức', periods: 1, note: '35 tiết/năm' },
    'tnxh': { name: 'Tự nhiên và Xã hội', periods: 2, note: '70 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm', periods: 3, note: '105 tiết/năm' },
  },
  2: {
    'tiengviet': { name: 'Tiếng Việt', periods: 10, note: '350 tiết/năm' },
    'toan': { name: 'Toán', periods: 5, note: '175 tiết/năm' },
    'daoduc': { name: 'Đạo đức', periods: 1, note: '35 tiết/năm' },
    'tnxh': { name: 'Tự nhiên và Xã hội', periods: 2, note: '70 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm', periods: 3, note: '105 tiết/năm' },
  },
  3: {
    'tiengviet': { name: 'Tiếng Việt', periods: 7, note: '245 tiết/năm' },
    'toan': { name: 'Toán', periods: 5, note: '175 tiết/năm' },
    'anh': { name: 'Tiếng Anh (Ngoại ngữ 1)', periods: 4, note: '140 tiết/năm' },
    'daoduc': { name: 'Đạo đức', periods: 1, note: '35 tiết/năm' },
    'tnxh': { name: 'Tự nhiên và Xã hội', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm', periods: 3, note: '105 tiết/năm' },
  },
  4: {
    'tiengviet': { name: 'Tiếng Việt', periods: 7, note: '245 tiết/năm' },
    'toan': { name: 'Toán', periods: 5, note: '175 tiết/năm' },
    'anh': { name: 'Tiếng Anh (Ngoại ngữ 1)', periods: 4, note: '140 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 2, note: '70 tiết/năm' },
    'khoahoc': { name: 'Khoa học', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'daoduc': { name: 'Đạo đức', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm', periods: 3, note: '105 tiết/năm' },
  },
  5: {
    'tiengviet': { name: 'Tiếng Việt', periods: 7, note: '245 tiết/năm' },
    'toan': { name: 'Toán', periods: 5, note: '175 tiết/năm' },
    'anh': { name: 'Tiếng Anh (Ngoại ngữ 1)', periods: 4, note: '140 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 2, note: '70 tiết/năm' },
    'khoahoc': { name: 'Khoa học', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'daoduc': { name: 'Đạo đức', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm', periods: 3, note: '105 tiết/năm' },
  },

  // --- CẤP THCS (Khối 6 -> Khối 9) ---
  6: {
    'nguvan': { name: 'Ngữ văn', periods: 4, note: '140 tiết/năm' },
    'toan': { name: 'Toán', periods: 4, note: '140 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdcd': { name: 'Giáo dục công dân', periods: 1, note: '35 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 3, note: '105 tiết/năm' },
    'khtn': { name: 'Khoa học tự nhiên', periods: 4, note: '140 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
  },
  7: {
    'nguvan': { name: 'Ngữ văn', periods: 4, note: '140 tiết/năm' },
    'toan': { name: 'Toán', periods: 4, note: '140 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdcd': { name: 'Giáo dục công dân', periods: 1, note: '35 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 3, note: '105 tiết/năm' },
    'khtn': { name: 'Khoa học tự nhiên', periods: 4, note: '140 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
  },
  8: {
    'nguvan': { name: 'Ngữ văn', periods: 4, note: '140 tiết/năm' },
    'toan': { name: 'Toán', periods: 4, note: '140 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdcd': { name: 'Giáo dục công dân', periods: 1, note: '35 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 3, note: '105 tiết/năm' },
    'khtn': { name: 'Khoa học tự nhiên', periods: 4, note: '140 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
  },
  9: {
    'nguvan': { name: 'Ngữ văn', periods: 4, note: '140 tiết/năm' },
    'toan': { name: 'Toán', periods: 4, note: '140 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdcd': { name: 'Giáo dục công dân', periods: 1, note: '35 tiết/năm' },
    'ls_dl': { name: 'Lịch sử và Địa lí', periods: 3, note: '105 tiết/năm' },
    'khtn': { name: 'Khoa học tự nhiên', periods: 4, note: '140 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 1, note: '35 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 1, note: '35 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'nghethuat': { name: 'Nghệ thuật (Âm nhạc, Mĩ thuật)', periods: 2, note: '70 tiết/năm' },
    'amnhac': { name: 'Âm nhạc', periods: 1, note: '35 tiết/năm' },
    'mithuat': { name: 'Mĩ thuật', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
  },

  // --- CẤP THPT (Khối 10 -> Khối 12) ---
  10: {
    'nguvan': { name: 'Ngữ văn', periods: 3, note: '105 tiết/năm' },
    'toan': { name: 'Toán', periods: 3, note: '105 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'gdqp': { name: 'Giáo dục quốc phòng và an ninh', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
    'vatly': { name: 'Vật lí', periods: 2, note: '70 tiết/năm' },
    'hoahoc': { name: 'Hóa học', periods: 2, note: '70 tiết/năm' },
    'sinhhoc': { name: 'Sinh học', periods: 2, note: '70 tiết/năm' },
    'lichsu': { name: 'Lịch sử', periods: 2, note: '70 tiết/năm' },
    'diali': { name: 'Địa lí', periods: 2, note: '70 tiết/năm' },
    'gdkt_pl': { name: 'GD Kinh tế và Pháp luật', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 2, note: '70 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 2, note: '70 tiết/năm' },
  },
  11: {
    'nguvan': { name: 'Ngữ văn', periods: 3, note: '105 tiết/năm' },
    'toan': { name: 'Toán', periods: 3, note: '105 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'gdqp': { name: 'Giáo dục quốc phòng và an ninh', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
    'vatly': { name: 'Vật lí', periods: 2, note: '70 tiết/năm' },
    'hoahoc': { name: 'Hóa học', periods: 2, note: '70 tiết/năm' },
    'sinhhoc': { name: 'Sinh học', periods: 2, note: '70 tiết/năm' },
    'lichsu': { name: 'Lịch sử', periods: 2, note: '70 tiết/năm' },
    'diali': { name: 'Địa lí', periods: 2, note: '70 tiết/năm' },
    'gdkt_pl': { name: 'GD Kinh tế và Pháp luật', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 2, note: '70 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 2, note: '70 tiết/năm' },
  },
  12: {
    'nguvan': { name: 'Ngữ văn', periods: 3, note: '105 tiết/năm' },
    'toan': { name: 'Toán', periods: 3, note: '105 tiết/năm' },
    'anh': { name: 'Ngoại ngữ 1 (Tiếng Anh)', periods: 3, note: '105 tiết/năm' },
    'gdtc': { name: 'Giáo dục thể chất', periods: 2, note: '70 tiết/năm' },
    'gdqp': { name: 'Giáo dục quốc phòng và an ninh', periods: 1, note: '35 tiết/năm' },
    'hdtn': { name: 'Hoạt động trải nghiệm, hướng nghiệp', periods: 3, note: '105 tiết/năm' },
    'gddp': { name: 'Nội dung GD địa phương', periods: 1, note: '35 tiết/năm' },
    'vatly': { name: 'Vật lí', periods: 2, note: '70 tiết/năm' },
    'hoahoc': { name: 'Hóa học', periods: 2, note: '70 tiết/năm' },
    'sinhhoc': { name: 'Sinh học', periods: 2, note: '70 tiết/năm' },
    'lichsu': { name: 'Lịch sử', periods: 2, note: '70 tiết/năm' },
    'diali': { name: 'Địa lí', periods: 2, note: '70 tiết/năm' },
    'gdkt_pl': { name: 'GD Kinh tế và Pháp luật', periods: 2, note: '70 tiết/năm' },
    'tinhoc': { name: 'Tin học', periods: 2, note: '70 tiết/năm' },
    'congnghe': { name: 'Công nghệ', periods: 2, note: '70 tiết/năm' },
  }
};

/**
 * Chuẩn hóa tên/mã môn học để tra cứu định mức chuẩn
 */
export function normalizeSubjectKey(str: string): string {
  if (!str) return '';
  const norm = String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  
  if (norm.includes('hdtn') || norm.includes('trai nghiem') || norm.includes('huong nghiep') || norm === 'hdtn-hn' || norm === 'hdtn_hn') {
    return 'hdtn';
  }
  if (norm === 'toan' || norm.includes('toan hoc') || norm.startsWith('toan')) {
    return 'toan';
  }
  if (norm === 'van' || norm.includes('ngu van') || norm.startsWith('van')) {
    return 'nguvan';
  }
  if (norm.includes('tieng viet')) {
    return 'tiengviet';
  }
  if (norm.includes('anh') || norm.includes('ngoai ngu') || norm.includes('english') || norm === 'tienganh') {
    return 'anh';
  }
  if (norm === 'khtn' || norm.includes('khoa hoc tu nhien')) {
    return 'khtn';
  }
  if (norm.includes('lich su') && norm.includes('dia li') || norm === 'ls_dl' || norm === 'ls-dl' || norm.includes('ls&dl')) {
    return 'ls_dl';
  }
  if (norm === 'lich su' || norm === 'su') {
    return 'lichsu';
  }
  if (norm === 'dia li' || norm === 'dia' || norm === 'dia ly') {
    return 'diali';
  }
  if (norm === 'gdcd' || norm.includes('cong dan')) {
    return 'gdcd';
  }
  if (norm.includes('dao duc')) {
    return 'daoduc';
  }
  if (norm === 'gdtc' || norm.includes('the chat') || norm.includes('the duc')) {
    return 'gdtc';
  }
  if (norm.includes('tin hoc') || norm === 'tin' || norm === 'tinhoc') {
    return 'tinhoc';
  }
  if (norm.includes('cong nghe') || norm === 'cn' || norm === 'congnghe') {
    return 'congnghe';
  }
  if (norm.includes('am nhac') || norm === 'nhac') {
    return 'amnhac';
  }
  if (norm.includes('mi thuat') || norm.includes('my thuat') || norm === 've') {
    return 'mithuat';
  }
  if (norm.includes('nghe thuat')) {
    return 'nghethuat';
  }
  if (norm.includes('quoc phong') || norm === 'gdqp' || norm === 'gdqpan') {
    return 'gdqp';
  }
  if (norm.includes('dia phuong') || norm === 'gddp') {
    return 'gddp';
  }
  if (norm.includes('tu nhien va xa hoi') || norm === 'tnxh') {
    return 'tnxh';
  }
  if (norm.includes('khoa hoc') && !norm.includes('tu nhien')) {
    return 'khoahoc';
  }

  return norm;
}

/**
 * Trích xuất khối lớp từ tên lớp (vd: '8A11' -> 8, '6A1' -> 6, '10A2' -> 10, '12A1' -> 12)
 */
export function extractGradeFromClassName(className: string): number {
  const match = String(className || '').match(/^(\d+)/);
  if (match) {
    const g = parseInt(match[1]);
    if (g >= 1 && g <= 12) return g;
  }
  return 0;
}

export interface CurriculumConflictItem {
  classId: string;
  grade: number;
  subjectKey: string;
  subjectDisplayName: string;
  totalAssigned: number;
  standardRequired: number;
  diff: number;
  type: 'EXCESS' | 'DEFICIT';
  teachersDetail: Array<{ teacherId: string; teacherName: string; periods: number }>;
  multiTeacherIssue: boolean;
  detailedCause: string;
  actionSolution: string;
  message: string;
}

/**
 * Tự động đối soát dữ liệu Phân công với Khung chuẩn CT GDPT 2018
 * Phát hiện chính xác: Môn bị phân công thừa/thiếu tiết, hoặc nhiều GV cùng dạy 1 môn làm số tiết bị nhân lên (vd: 3 GV dạy HĐTN mỗi người 3t -> 9 tiết)
 */
export function auditAssignmentsAgainstCurriculum(rawAssignments: any[]): CurriculumConflictItem[] {
  const conflicts: CurriculumConflictItem[] = [];
  if (!rawAssignments || rawAssignments.length === 0) return conflicts;

  // Gom nhóm phân công theo: classId -> subjectKey -> danh sách giáo viên & số tiết
  const classSubjectMap = new Map<string, Map<string, {
    subjectDisplayName: string;
    teachers: Array<{ teacherId: string; teacherName: string; periods: number }>;
    totalPeriods: number;
  }>>();

  rawAssignments.forEach(a => {
    const subRaw = String(a['Mã Môn (*)'] || a['Mã Môn'] || a['Tên Môn (*)'] || a['Tên Môn'] || '').trim();
    const subKey = normalizeSubjectKey(subRaw);
    const subDisplay = String(a['Tên Môn'] || a['Mã Môn (*)'] || a['Mã Môn'] || subRaw).trim();
    const periods = parseInt(a['Số tiết/tuần (*)'] || a['Số tiết/tuần'] || '0') || 0;
    const teacherId = String(a['Mã GV (*)'] || a['Mã GV'] || '').trim();
    const teacherName = String(a['Tên GV'] || a['Tên GV (*)'] || a['Họ và tên'] || teacherId).trim();

    const classes = String(a['Lớp (*)'] || a['Lớp'] || '').split(/[,;\s]+/).map(c => c.trim()).filter(Boolean);

    classes.forEach(classId => {
      if (!classSubjectMap.has(classId)) {
        classSubjectMap.set(classId, new Map());
      }
      const subMap = classSubjectMap.get(classId)!;
      if (!subMap.has(subKey)) {
        subMap.set(subKey, {
          subjectDisplayName: subDisplay,
          teachers: [],
          totalPeriods: 0
        });
      }
      const entry = subMap.get(subKey)!;
      entry.teachers.push({ teacherId, teacherName, periods });
      entry.totalPeriods += periods;
    });
  });

  // Đối soát với chuẩn GDPT 2018
  for (const [classId, subMap] of classSubjectMap.entries()) {
    const grade = extractGradeFromClassName(classId);
    if (!grade || !GDPT_2018_STANDARDS[grade]) continue;

    const standardsForGrade = GDPT_2018_STANDARDS[grade];

    for (const [subKey, assignedData] of subMap.entries()) {
      const standard = standardsForGrade[subKey];
      if (standard) {
        const standardReq = standard.periods;
        const assignedTotal = assignedData.totalPeriods;
        const diff = assignedTotal - standardReq;

        if (diff !== 0) {
          const type = diff > 0 ? 'EXCESS' : 'DEFICIT';
          const teachers = assignedData.teachers;
          const multiTeacher = type === 'EXCESS' && teachers.length > 1;

          let detailedCause = '';
          let actionSolution = '';

          if (multiTeacher) {
            const teachersDetailStr = teachers.map(t => `${t.teacherName} (${t.periods}t)`).join(' + ');
            detailedCause = `Lớp ${classId} có ${teachers.length} giáo viên cùng được gán dạy môn ${standard.name} (${teachersDetailStr} = ${assignedTotal} tiết/tuần). Do đó tổng số tiết môn này bị nhân lên gấp ${Number((assignedTotal / standardReq).toFixed(1))} lần so với định mức chuẩn CT GDPT 2018 (${standardReq} tiết/tuần), gây thừa ${diff} tiết!`;
            actionSolution = `Vào tab "Phân công", tìm lớp ${classId} môn ${standard.name} và chia lại số tiết cho ${teachers.length} giáo viên sao cho tổng bằng đúng ${standardReq} tiết/tuần (ví dụ: mỗi GV 1 tiết nếu 3 GV), hoặc xóa bỏ bớt giáo viên bị phân công trùng.`;
          } else if (type === 'EXCESS') {
            detailedCause = `Lớp ${classId} môn ${standard.name} được phân công ${assignedTotal} tiết/tuần, vượt quá ${diff} tiết so với định mức chuẩn CT GDPT 2018 (${standardReq} tiết/tuần). Giáo viên phụ trách: ${teachers.map(t => `${t.teacherName} (${t.periods}t)`).join(', ')}.`;
            actionSolution = `Vào tab "Phân công", tìm lớp ${classId} môn ${standard.name} và sửa lại số tiết/tuần từ ${assignedTotal} về đúng chuẩn ${standardReq} tiết/tuần.`;
          } else {
            detailedCause = `Lớp ${classId} môn ${standard.name} mới phân công ${assignedTotal} tiết/tuần, còn thiếu ${Math.abs(diff)} tiết so với định mức chuẩn CT GDPT 2018 (${standardReq} tiết/tuần).`;
            actionSolution = `Vào tab "Phân công", tăng số tiết hoặc phân công bổ sung giáo viên cho lớp ${classId} môn ${standard.name} để đủ ${standardReq} tiết/tuần.`;
          }

          const message = `${detailedCause} -> Hướng xử lý: ${actionSolution}`;

          conflicts.push({
            classId,
            grade,
            subjectKey: subKey,
            subjectDisplayName: standard.name || assignedData.subjectDisplayName,
            totalAssigned: assignedTotal,
            standardRequired: standardReq,
            diff,
            type,
            teachersDetail: teachers,
            multiTeacherIssue: multiTeacher,
            detailedCause,
            actionSolution,
            message
          });
        }
      }
    }
  }

  // Sắp xếp các lỗi thừa tiết nghiêm trọng / nhiều GV gán trùng lên đầu
  return conflicts.sort((a, b) => {
    if (a.multiTeacherIssue && !b.multiTeacherIssue) return -1;
    if (!a.multiTeacherIssue && b.multiTeacherIssue) return 1;
    if (a.type === 'EXCESS' && b.type !== 'EXCESS') return -1;
    if (a.type !== 'EXCESS' && b.type === 'EXCESS') return 1;
    return b.diff - a.diff;
  });
}

export interface ClassSubjectDetail {
  subjectKey: string;
  subjectDisplayName: string;
  assignedPeriods: number;
  standardPeriods: number;
  diff: number;
  status: 'OK' | 'EXCESS' | 'DEFICIT';
  teachers: Array<{ teacherId: string; teacherName: string; periods: number }>;
}

export interface ClassDiagnosticIssue {
  classId: string;
  grade: number;
  sessionType: string;
  daysCount: number;
  maxWeeklyCapacity: number;
  totalAssignedPeriods: number;
  capacityDiff: number;
  isOverCapacity: boolean;
  hasCurriculumError: boolean;
  subjectDetails: ClassSubjectDetail[];
  summary: string;
  actionSolution: string;
}

/**
 * Tự động đối soát dữ liệu Phân công chi tiết cho TỪNG LỚP HỌC (kiểm tra tổng tiết, sức chứa và từng môn)
 * Hỗ trợ chính xác trường hợp 1 lớp có nhiều dòng cấu hình (vd: T2..T6 sáng 5t + T7 sáng 5t = 30t/tuần)
 */
export function auditClassesDetailedIssues(rawAssignments: any[], classesList: any[] = []): ClassDiagnosticIssue[] {
  const issues: ClassDiagnosticIssue[] = [];
  if (!rawAssignments || rawAssignments.length === 0) return issues;

  // Lấy dữ liệu lớp từ param hoặc fallback userStorage
  let effectiveClasses = classesList;
  if (!effectiveClasses || effectiveClasses.length === 0) {
    try {
      const stored = getUserItem('data_Lớp học');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) effectiveClasses = parsed;
      }
    } catch {}
  }

  // Gom tất cả các dòng cấu hình theo từng lớp: classId -> Map(day -> Set(periods))
  const classScheduleSlotsMap = new Map<string, Map<number, Set<number>>>();
  const classGradeMap = new Map<string, number>();

  if (Array.isArray(effectiveClasses)) {
    effectiveClasses.forEach(c => {
      const cid = String(c['Mã Lớp (*)'] || c['Mã Lớp'] || '').trim();
      if (!cid) return;

      const gradeVal = parseInt(c['Khối (*)'] || c['Khối'] || '') || extractGradeFromClassName(cid);
      if (gradeVal) classGradeMap.set(cid, gradeVal);

      if (!classScheduleSlotsMap.has(cid)) {
        classScheduleSlotsMap.set(cid, new Map<number, Set<number>>());
      }
      const dayMap = classScheduleSlotsMap.get(cid)!;

      const daysRaw = String(c['Ngày học (*)'] || c['Ngày học'] || '2,3,4,5,6,7');
      const morningRaw = String(c['Tiết học Sáng (*)'] || c['Tiết học Sáng'] || c['Sáng'] || '');
      const afternoonRaw = String(c['Tiết học Chiều (*)'] || c['Tiết học Chiều'] || c['Chiều'] || '');
      const sessionRaw = String(c['Buổi học (*)'] || c['Buổi học'] || c['Buổi'] || '').trim().toLowerCase();

      // Parse danh sách ngày học (2..7)
      const days = daysRaw.split(/[,;\.\s]+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 2 && d <= 7);
      const targetDays = days.length > 0 ? days : [2, 3, 4, 5, 6, 7];

      // Parse tiết sáng (1..5)
      const morningPeriods = morningRaw.split(/[,;\.\s]+/).map(p => parseInt(p.trim())).filter(p => !isNaN(p) && p >= 1 && p <= 5);

      // Parse tiết chiều: hỗ trợ 1..5 (quy đổi 6..10) hoặc 6..10
      const rawAfternoonList = afternoonRaw.split(/[,;\.\s]+/).map(p => parseInt(p.trim())).filter(p => !isNaN(p));
      const afternoonPeriods = rawAfternoonList.map(p => {
        if (p >= 1 && p <= 5) return p + 5;
        if (p >= 6 && p <= 10) return p;
        return null;
      }).filter((p): p is number => p !== null);

      // Fallback theo tên buổi học nếu không điền tiết cụ thể
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

      // Fallback mặc định theo khối nếu hoàn toàn không có thông tin tiết lẫn buổi
      if (morningPeriods.length === 0 && afternoonPeriods.length === 0) {
        if (gradeVal === 8 || gradeVal === 9) {
          afternoonPeriods.push(6, 7, 8, 9, 10);
        } else {
          morningPeriods.push(1, 2, 3, 4, 5);
        }
      }

      const allowedPeriods = [...morningPeriods, ...afternoonPeriods];

      targetDays.forEach(d => {
        if (!dayMap.has(d)) dayMap.set(d, new Set<number>());
        allowedPeriods.forEach(p => dayMap.get(d)!.add(p));
      });
    });
  }

  // Gom nhóm phân công theo lớp: classId -> subjectKey -> danh sách gv & số tiết
  const classAssignmentsMap = new Map<string, Map<string, {
    subjectDisplayName: string;
    teachers: Array<{ teacherId: string; teacherName: string; periods: number }>;
    totalPeriods: number;
  }>>();

  rawAssignments.forEach(a => {
    const subRaw = String(a['Mã Môn (*)'] || a['Mã Môn'] || a['Tên Môn (*)'] || a['Tên Môn'] || '').trim();
    const subKey = normalizeSubjectKey(subRaw);
    const subDisplay = String(a['Tên Môn'] || a['Mã Môn (*)'] || a['Mã Môn'] || subRaw).trim();
    const periods = parseInt(a['Số tiết/tuần (*)'] || a['Số tiết/tuần'] || '0') || 0;
    const teacherId = String(a['Mã GV (*)'] || a['Mã GV'] || '').trim();
    const teacherName = String(a['Tên GV'] || a['Tên GV (*)'] || a['Họ và tên'] || teacherId).trim();

    const classes = String(a['Lớp (*)'] || a['Lớp'] || '').split(/[,;\s]+/).map(c => c.trim()).filter(Boolean);

    classes.forEach(classId => {
      if (!classAssignmentsMap.has(classId)) {
        classAssignmentsMap.set(classId, new Map());
      }
      const subMap = classAssignmentsMap.get(classId)!;
      if (!subMap.has(subKey)) {
        subMap.set(subKey, {
          subjectDisplayName: subDisplay,
          teachers: [],
          totalPeriods: 0
        });
      }
      const entry = subMap.get(subKey)!;
      entry.teachers.push({ teacherId, teacherName, periods });
      entry.totalPeriods += periods;
    });
  });

  for (const [classId, subMap] of classAssignmentsMap.entries()) {
    const grade = classGradeMap.get(classId) || extractGradeFromClassName(classId);
    const dayMap = classScheduleSlotsMap.get(classId);

    let maxWeeklyCapacity = 0;
    let daysCount = 0;
    let sessionType = '';

    if (dayMap && dayMap.size > 0) {
      daysCount = dayMap.size;
      for (const pSet of dayMap.values()) {
        maxWeeklyCapacity += pSet.size;
      }

      // Xác định phiên học
      let hasMorning = false;
      let hasAfternoon = false;
      for (const pSet of dayMap.values()) {
        for (const p of pSet) {
          if (p <= 5) hasMorning = true;
          if (p >= 6) hasAfternoon = true;
        }
      }

      const activeDays = Array.from(dayMap.keys()).sort((a, b) => a - b);
      const dayLabels = activeDays.map(d => `T${d}`).join(',');

      if (hasMorning && hasAfternoon) {
        const isOnlyT7Morning = dayMap.has(7) && Array.from(dayMap.get(7)!).every(p => p <= 5);
        const isT26Afternoon = [2, 3, 4, 5, 6].every(d => !dayMap.has(d) || Array.from(dayMap.get(d)!).every(p => p >= 6));
        if (isOnlyT7Morning && isT26Afternoon) {
          sessionType = `Chiều T2-T6 + Sáng T7 (${daysCount} ngày)`;
        } else {
          sessionType = `2 Buổi (Sáng & Chiều - ${daysCount} ngày)`;
        }
      } else if (hasMorning) {
        sessionType = `Buổi Sáng (${dayLabels} - ${daysCount} ngày)`;
      } else if (hasAfternoon) {
        sessionType = `Buổi Chiều (${dayLabels} - ${daysCount} ngày)`;
      } else {
        sessionType = `${daysCount} ngày học`;
      }
    } else {
      // Mặc định chuẩn THCS/THPT nếu lớp chưa được định nghĩa trong sheet: 30 tiết (6 ngày x 5 tiết)
      maxWeeklyCapacity = 30;
      daysCount = 6;
      sessionType = grade === 8 || grade === 9 ? 'Chiều T2-T6 + Sáng T7 (6 ngày)' : 'Buổi Sáng (T2-T7 - 6 ngày)';
    }

    let totalAssignedPeriods = 0;
    const subjectDetails: ClassSubjectDetail[] = [];
    const standardsForGrade = grade && GDPT_2018_STANDARDS[grade] ? GDPT_2018_STANDARDS[grade] : null;

    let hasCurriculumError = false;
    const errorMessages: string[] = [];

    for (const [subKey, assignedData] of subMap.entries()) {
      totalAssignedPeriods += assignedData.totalPeriods;
      const standard = standardsForGrade ? standardsForGrade[subKey] : null;
      const standardReq = standard ? standard.periods : assignedData.totalPeriods;
      const diff = assignedData.totalPeriods - standardReq;

      let status: 'OK' | 'EXCESS' | 'DEFICIT' = 'OK';
      if (standard && diff !== 0) {
        hasCurriculumError = true;
        status = diff > 0 ? 'EXCESS' : 'DEFICIT';
        if (diff > 0) {
          errorMessages.push(`Môn ${standard.name} phân công ${assignedData.totalPeriods}t (thừa ${diff}t so với chuẩn ${standardReq}t)`);
        } else {
          errorMessages.push(`Môn ${standard.name} phân công ${assignedData.totalPeriods}t (thiếu ${Math.abs(diff)}t so với chuẩn ${standardReq}t)`);
        }
      }

      subjectDetails.push({
        subjectKey: subKey,
        subjectDisplayName: standard?.name || assignedData.subjectDisplayName,
        assignedPeriods: assignedData.totalPeriods,
        standardPeriods: standardReq,
        diff,
        status,
        teachers: assignedData.teachers
      });
    }

    const capacityDiff = totalAssignedPeriods - maxWeeklyCapacity;
    const isOverCapacity = capacityDiff > 0;

    let summary = '';
    let actionSolution = '';

    if (isOverCapacity) {
      summary = `Lớp ${classId} có ${maxWeeklyCapacity} slot học/tuần (${sessionType}), nhưng đang được phân công ${totalAssignedPeriods} tiết (VƯỢT ${capacityDiff} TIẾT).`;
      actionSolution = `Vào tab "Phân công", tìm lớp ${classId} và giảm bớt ${capacityDiff} tiết (hoặc kiểm tra các môn bị phân công thừa: ${errorMessages.join(', ') || 'kiểm tra các môn'}) để tổng tiết không vượt quá ${maxWeeklyCapacity} tiết.`;
    } else if (hasCurriculumError) {
      summary = `Lớp ${classId} được phân công ${totalAssignedPeriods}/${maxWeeklyCapacity} tiết (đủ sức chứa), nhưng có môn học phân công chưa đúng định mức chuẩn CT GDPT 2018 (${errorMessages.join(', ')}).`;
      actionSolution = `Vào tab "Phân công", điều chỉnh lại số tiết các môn của lớp ${classId} theo đúng chuẩn định mức quy định.`;
    } else {
      summary = `Lớp ${classId} được phân công ${totalAssignedPeriods}/${maxWeeklyCapacity} tiết (${sessionType}), các môn đều đúng định mức chuẩn.`;
      actionSolution = `Lớp học hợp lệ.`;
    }

    issues.push({
      classId,
      grade,
      sessionType,
      daysCount,
      maxWeeklyCapacity,
      totalAssignedPeriods,
      capacityDiff,
      isOverCapacity,
      hasCurriculumError,
      subjectDetails,
      summary,
      actionSolution
    });
  }

  // Sắp xếp các lớp bị lỗi lên trước
  return issues.sort((a, b) => {
    if (a.isOverCapacity && !b.isOverCapacity) return -1;
    if (!a.isOverCapacity && b.isOverCapacity) return 1;
    if (a.hasCurriculumError && !b.hasCurriculumError) return -1;
    if (!a.hasCurriculumError && b.hasCurriculumError) return 1;
    return a.classId.localeCompare(b.classId, 'vi');
  });
}

/**
 * Mapping model id sang danh sách candidate endpoint của Google Generative AI
 */
function getApiEndpointCandidates(modelId: string): string[] {
  switch (modelId) {
    case 'gemini-3.7-flash':
      return ['gemini-2.5-pro', 'gemini-2.0-pro-exp-02-05', 'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    case 'gemini-3.6-flash':
      return ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    case 'gemini-3.5-flash':
    default:
      return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
  }
}

/**
 * Gọi Google Generative Language API với hỗ trợ tự động fallback
 */
async function callGeminiApi(apiKey: string, modelId: string, prompt: string, systemInstruction?: string): Promise<string> {
  const candidates = [modelId, ...getApiEndpointCandidates(modelId)];
  // Loại bỏ trùng lặp
  const uniqueCandidates = Array.from(new Set(candidates));

  let lastError: any = null;

  for (const candidate of uniqueCandidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey.trim()}`;
      
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        
        // Nếu lỗi 404 (Model not found) hoặc unsupported, thử candidate tiếp theo
        if (res.status === 404 || errMsg.includes('not found') || errMsg.includes('is not supported')) {
          lastError = new Error(`Model ${candidate} không khả dụng: ${errMsg}`);
          continue;
        }
        
        throw new Error(errMsg);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      } else {
        throw new Error('Google AI không trả về nội dung văn bản hợp lệ.');
      }
    } catch (err: any) {
      lastError = err;
      if (err.message && (err.message.includes('API key not valid') || err.message.includes('permission') || err.message.includes('Quota'))) {
        throw err; // Lỗi xác thực hoặc hết hạn mức thì dừng ngay
      }
    }
  }

  throw lastError || new Error('Không thể kết nối đến Google Gemini API.');
}

/**
 * Kiểm tra kết nối API Key và Model
 */
export async function testGeminiApiKey(apiKey: string, modelId: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Vui lòng nhập Google Gemini API Key.' };
  }

  try {
    const response = await callGeminiApi(
      apiKey,
      modelId,
      'Hãy trả lời ngắn gọn: "Kết nối thành công với Google Gemini AI!"'
    );

    return {
      success: true,
      message: response.trim() || 'Kết nối API thành công!'
    };
  } catch (error: any) {
    let msg = error?.message || 'Không thể kết nối đến Google Gemini API.';
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      msg = 'API Key không hợp lệ hoặc đã bị vô hiệu hóa trên Google Cloud Console.';
    } else if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota')) {
      msg = 'API Key đã vượt quá hạn mức miễn phí (Rate Limit / Quota Exceeded).';
    }
    return {
      success: false,
      message: msg
    };
  }
}

export interface TeacherAiIssue {
  teacherId: string;
  teacherName: string;
  classId: string;
  subjectName: string;
  missingPeriods: number;
  rootCause: string;
  actionableSolution: string;
}

export interface AiDiagnosticReport {
  summary: string;
  teacherIssues: TeacherAiIssue[];
  classIssues?: ClassDiagnosticIssue[];
  curriculumConflicts?: CurriculumConflictItem[];
  generalSolutions: string[];
  rawMarkdown?: string;
  modelUsed: string;
  timestamp: string;
}

/**
 * Phân tích chuyên sâu các lỗi chưa xếp được TKB
 */
export async function analyzeTimetableErrors(params: {
  unassignedLessons: any[];
  schedule: any[];
  rawAssignments: any[];
  constraints: any[];
  classes: any[];
  teachers: any[];
  subjects: any[];
  rooms?: any[];
}): Promise<AiDiagnosticReport> {
  const apiKey = getStoredApiKey();
  const modelId = getStoredAiModel();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const { unassignedLessons, schedule, rawAssignments, constraints, classes, teachers, subjects, rooms } = params;

  // 1. Tự động kiểm tra đối soát Phân công với Khung Chuẩn CT GDPT 2018
  const curriculumConflicts = auditAssignmentsAgainstCurriculum(rawAssignments);

  // 2. Tự động kiểm tra đối soát Phân công chi tiết cho TỪNG LỚP HỌC (sức chứa, quá tải, từng môn)
  const classIssues = auditClassesDetailedIssues(rawAssignments, classes);

  if (!unassignedLessons || unassignedLessons.length === 0) {
    const errorCount = curriculumConflicts.length + classIssues.filter(c => c.isOverCapacity).length;
    return {
      summary: errorCount > 0
        ? `Tất cả các tiết đã xếp xong, nhưng phát hiện ${curriculumConflicts.length} môn học bị phân công sai lệch định mức chuẩn CT GDPT 2018!`
        : 'Tất cả các tiết đã được xếp hoàn tất 100%! Không có lỗi phân công.',
      teacherIssues: [],
      classIssues,
      curriculumConflicts,
      generalSolutions: ['Thời khóa biểu đã hoàn thiện đầy đủ.'],
      modelUsed: modelId,
      timestamp: new Date().toLocaleString('vi-VN')
    };
  }

  // Thu thập danh sách GV và Lớp bị ảnh hưởng
  const affectedTeacherIds = Array.from(new Set(unassignedLessons.map(u => String(u.teacherId || '').trim())));
  const affectedClassIds = Array.from(new Set(unassignedLessons.map(u => String(u.classId || '').trim())));

  // Lọc thông tin phân công liên quan
  const relevantAssignments = rawAssignments.filter(a => {
    const tid = String(a['Mã GV (*)'] || a['Mã GV'] || '').trim();
    const cls = String(a['Lớp (*)'] || a['Lớp'] || '').trim();
    return affectedTeacherIds.includes(tid) || affectedClassIds.some(c => cls.includes(c));
  });

  // Lọc thông tin giáo viên liên quan (kèm ràng buộc nghỉ cố định)
  const relevantTeachers = teachers.filter(t => {
    const tid = String(t['Mã GV (*)'] || t['Mã GV'] || '').trim();
    return affectedTeacherIds.includes(tid);
  }).map(t => ({
    maGV: t['Mã GV (*)'] || t['Mã GV'],
    tenGV: t['Họ và tên (*)'] || t['Tên GV'],
    to: t['Tổ chuyên môn'],
    rangBuocNghi: t['Ràng buộc thời gian (Nghỉ cố định)'] || 'Không có',
    dinhMucNgay: t['Số tiết định mức tối đa/ngày'] || 'Mặc định'
  }));

  // Lọc thông tin lớp học liên quan
  const relevantClasses = classes.filter(c => {
    const cid = String(c['Mã Lớp (*)'] || c['Mã Lớp'] || '').trim();
    return affectedClassIds.includes(cid);
  }).map(c => ({
    maLop: c['Mã Lớp (*)'] || c['Mã Lớp'],
    khoi: c['Khối (*)'] || c['Khối'],
    ngayHoc: c['Ngày học (*)'] || c['Ngày học'],
    tietSang: c['Tiết học Sáng (*)'] || c['Tiết học Sáng'],
    tietChieu: c['Tiết học Chiều (*)'] || c['Tiết học Chiều']
  }));

  // Thống kê số tiết đã xếp thực tế của các GV bị kẹt
  const teacherScheduledStats = affectedTeacherIds.map(tid => {
    const items = schedule.filter(s => s.teacherId === tid);
    const byDay: Record<string, number> = {};
    items.forEach(i => {
      byDay[`Thứ ${i.day}`] = (byDay[`Thứ ${i.day}`] || 0) + 1;
    });
    return {
      maGV: tid,
      soTietDaXep: items.length,
      phanBoTheoNgay: byDay
    };
  });

  // Thống kê số tiết đã xếp của các lớp bị kẹt
  const classScheduledStats = affectedClassIds.map(cid => {
    const items = schedule.filter(s => s.classId === cid);
    const byDay: Record<string, number> = {};
    items.forEach(i => {
      byDay[`Thứ ${i.day}`] = (byDay[`Thứ ${i.day}`] || 0) + 1;
    });
    return {
      maLop: cid,
      soTietDaXep: items.length,
      phanBoTheoNgay: byDay
    };
  });

  const promptContext = {
    danhSachTietChuaXep: unassignedLessons.map((u, index) => ({
      stt: index + 1,
      lop: u.classId,
      mon: u.subjectName || u.subjectId,
      maGV: u.teacherId,
      tenGV: u.teacherName || u.teacherId,
      soTietThieu: u.size || 1,
      lyDoSobO: u.reason || ''
    })),
    doiSoatChiTietTheoLop: classIssues.filter(c => affectedClassIds.includes(c.classId) || c.isOverCapacity || c.hasCurriculumError).map(c => ({
      lop: c.classId,
      khoi: c.grade,
      buoiHoc: c.sessionType,
      soSlotToiDaTrongTuan: c.maxWeeklyCapacity,
      tongTietPhanCong: c.totalAssignedPeriods,
      tinhTrangQuaTai: c.isOverCapacity ? `QUÁ TẢI ${c.capacityDiff} TIẾT (Phân công ${c.totalAssignedPeriods}t > Sức chứa ${c.maxWeeklyCapacity}t)` : 'Trong định mức sức chứa',
      chiTietTungMonTrongLop: c.subjectDetails.map(s => ({
        mon: s.subjectDisplayName,
        phanCong: s.assignedPeriods,
        chuanGDPT: s.standardPeriods,
        trangThai: s.status === 'EXCESS' ? `Thừa ${s.diff}t` : s.status === 'DEFICIT' ? `Thiếu ${Math.abs(s.diff)}t` : 'Chuẩn',
        giaoVienDay: s.teachers.map(t => `${t.teacherName} (${t.periods}t)`).join(', ')
      })),
      tomTatLoiLop: c.summary,
      huongXuLyLop: c.actionSolution
    })),
    doiSoatDinhMucChuanGDPT2018: curriculumConflicts.map(c => ({
      lop: c.classId,
      khoi: c.grade,
      monHoc: c.subjectDisplayName,
      soTietPhanCongThucTe: c.totalAssigned,
      soTietChuanBoGiaoDuc: c.standardRequired,
      chenhLech: c.diff > 0 ? `Thừa ${c.diff} tiết` : `Thiếu ${Math.abs(c.diff)} tiết`,
      giaoVienPhanCong: c.teachersDetail.map(t => `${t.teacherName} (${t.periods} tiết)`).join(', '),
      canhBao: c.message
    })),
    thongTinMonHoc: subjects || [],
    thongTinGiaoVienBiKet: relevantTeachers,
    thongTinLopBiKet: relevantClasses,
    phanCongChuyenMonLienQuan: relevantAssignments,
    rangBuocGhimCamChung: constraints,
    phongChucNang: rooms || [],
    thongKeTietDaXepGV: teacherScheduledStats,
    thongKeTietDaXepLop: classScheduledStats
  };

  const systemInstruction = `Bạn là một Chuyên gia Cố vấn Cấp cao về Tối ưu hóa Thời khóa biểu và Chương trình Giáo dục Phổ thông 2018 (CT GDPT 2018 - Thông tư 32/2018/TT-BGDĐT) tại Việt Nam.

Nhiệm vụ trọng tâm của bạn:
1. ĐỐI SOÁT CHI TIẾT SỐ TIẾT VÀ TỪNG MÔN TRONG TỪNG LỚP HỌC:
   - Hãy kiểm tra kỹ trường "doiSoatChiTietTheoLop" và "doiSoatDinhMucChuanGDPT2018".
   - Nếu lớp học bị QUÁ TẢI TIẾT SO VỚI SỨC CHỨA (Ví dụ: Lớp chỉ học 5 buổi chiều x 5 tiết = 25 slot tối đa, nhưng phân công 28 tiết do môn HĐTN 6 tiết thay vì 3 tiết): BẠN PHẢI NÊU RÕ ĐÂY LÀ NGUYÊN NHÂN TRỰC TIẾP LÀM LỚP BỊ THỪA TIẾT VÀ KHÔNG THỂ XẾP HẾT VÀO LỊCH!
2. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ CHO TỪNG GIÁO VIÊN & TỪNG LỚP:
   - Với từng GV và Lớp bị kẹt tiết: Chỉ rõ chính xác bị kẹt do sai định mức GDPT 2018 của lớp nào/môn nào, do trùng lịch với lớp khác, dính ràng buộc nghỉ cố định thứ mấy, hay kín phòng bộ môn.
3. HƯỚNG DẪN SỬA LỖI CỤ THỂ, HÀNH ĐỘNG ĐƯỢC (Actionable Solutions):
   - Chỉ rõ Người xếp TKB cần mở tab nào (Phân công / Ràng buộc / Lớp học / Giáo viên), tìm dòng nào, cột nào và sửa số tiết về bao nhiêu để giải phóng xung đột.

Yêu cầu định dạng phản hồi:
Bạn PHẢI trả về ĐÚNG CẤU TRÚC JSON sau đây (không bọc thêm bất kỳ văn bản nào ngoài JSON):
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu về tổng thể các nguyên nhân gây nghẽn lịch, chỉ rõ các lớp học và môn học bị phân công thừa/thiếu tiết hoặc quá tải...",
  "teacherIssues": [
    {
      "teacherId": "Mã GV chính xác",
      "teacherName": "Tên GV",
      "classId": "Mã Lớp",
      "subjectName": "Tên Môn",
      "missingPeriods": 1,
      "rootCause": "Phân tích nguyên nhân cụ thể: Môn này trong lớp bị phân công bao nhiêu tiết (chuẩn GDPT là bao nhiêu), lớp bị quá tải ra sao, hoặc trùng lịch GV...",
      "actionableSolution": "Cách sửa cụ thể 1: Vào tab Phân công... sửa số tiết thành ... / Cách sửa 2: Vào tab Ràng buộc..."
    }
  ],
  "generalSolutions": [
    "Khuyến nghị 1 cho nhà trường...",
    "Khuyến nghị 2..."
  ]
}`;

  const prompt = `Dưới đây là dữ liệu các tiết chưa xếp được, đối soát chi tiết từng lớp học và chuẩn CT GDPT 2018:

${JSON.stringify(promptContext, null, 2)}

Hãy tiến hành phân tích chi tiết từng trường hợp giáo viên và lớp học bị kẹt tiết và trả về JSON theo đúng định dạng yêu cầu.`;

  try {
    const rawResponse = await callGeminiApi(apiKey, modelId, prompt, systemInstruction);

    // Parse JSON từ response (loại bỏ markdown block nếu có)
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleanJson);
      return {
        summary: parsed.summary || 'Đã phân tích xong các xung đột trong Thời khóa biểu.',
        teacherIssues: Array.isArray(parsed.teacherIssues) ? parsed.teacherIssues : [],
        classIssues,
        curriculumConflicts,
        generalSolutions: Array.isArray(parsed.generalSolutions) ? parsed.generalSolutions : [],
        rawMarkdown: rawResponse,
        modelUsed: modelId,
        timestamp: new Date().toLocaleString('vi-VN')
      };
    } catch {
      // Fallback nếu không parse được JSON hoàn chỉnh
      return {
        summary: 'Hệ thống AI đã phân tích chi tiết các nguyên nhân kẹt lịch:',
        teacherIssues: unassignedLessons.map(u => ({
          teacherId: u.teacherId,
          teacherName: u.teacherName || u.teacherId,
          classId: u.classId,
          subjectName: u.subjectName || u.subjectId,
          missingPeriods: u.size || 1,
          rootCause: rawResponse.slice(0, 300) + '...',
          actionableSolution: 'Vui lòng kiểm tra lại phân công và ràng buộc nghỉ của giáo viên này.'
        })),
        classIssues,
        curriculumConflicts,
        generalSolutions: ['Xem chi tiết nội dung phân tích từ AI ở phần báo cáo bên dưới.'],
        rawMarkdown: rawResponse,
        modelUsed: modelId,
        timestamp: new Date().toLocaleString('vi-VN')
      };
    }
  } catch (error: any) {
    console.error('Lỗi khi gọi AI phân tích TKB:', error);
    throw error;
  }
}
