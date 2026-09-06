import { getCurrentUser } from './cloudApi';

/**
 * Trả về username hiện tại đang đăng nhập
 */
export function getCurrentUsername(): string {
  const user = getCurrentUser() || localStorage.getItem('tkb_username');
  return user ? user.trim() : 'anonymous';
}

/**
 * Tạo key lưu trữ có tiền tố định danh người dùng: tkb_usr_{username}_{key}
 */
export function getUserStorageKey(key: string): string {
  const username = getCurrentUsername();
  return `tkb_usr_${username}_${key}`;
}

/**
 * Lấy dữ liệu từ localStorage theo tài khoản đang đăng nhập
 */
export function getUserItem(key: string): string | null {
  try {
    const userKey = getUserStorageKey(key);
    return localStorage.getItem(userKey);
  } catch (e) {
    console.error(`Lỗi đọc localStorage cho key ${key}:`, e);
    return null;
  }
}

/**
 * Lưu dữ liệu vào localStorage theo tài khoản đang đăng nhập
 */
export function setUserItem(key: string, value: string): void {
  try {
    const userKey = getUserStorageKey(key);
    localStorage.setItem(userKey, value);
  } catch (e) {
    console.error(`Lỗi ghi localStorage cho key ${key}:`, e);
  }
}

/**
 * Xóa dữ liệu trong localStorage theo tài khoản đang đăng nhập
 */
export function removeUserItem(key: string): void {
  try {
    const userKey = getUserStorageKey(key);
    localStorage.removeItem(userKey);
  } catch (e) {
    console.error(`Lỗi xóa localStorage cho key ${key}:`, e);
  }
}

/**
 * Dọn dẹp triệt để các key cũ dùng chung không có tiền tố tài khoản (tkb_data_*, tkb_config...)
 * để tránh việc dữ liệu cũ bị rò rỉ sang tài khoản mới.
 */
export function cleanLegacyUnscopedStorage(): void {
  try {
    const legacyKeys = [
      'tkb_config',
      'tkb_data_Lớp học',
      'tkb_data_Giáo viên',
      'tkb_data_GVCN',
      'tkb_data_Môn học',
      'tkb_data_Phòng học',
      'tkb_data_Phân công',
      'tkb_data_Ràng buộc',
      'tkb_data_Xếp TKB'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Không thể dọn dẹp legacy storage:', e);
  }
}
