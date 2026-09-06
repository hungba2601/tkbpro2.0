// ==========================================
// CẤU HÌNH API GOOGLE APP SCRIPT TẠI ĐÂY
// ==========================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztdQ39hN90ncwPfhkhdDGdUiRYOTyEPZ_fsf_YglzvY4msDClv3p-LxFJKW17sxZbC/exec";

import { cleanLegacyUnscopedStorage } from './userStorage';

// Lưu trữ username hiện tại
let currentUser: string | null = localStorage.getItem('tkb_username');

export function getCurrentUser() {
  return currentUser;
}

export function logout() {
  currentUser = null;
  localStorage.removeItem('tkb_username');
  cleanLegacyUnscopedStorage();
}

export async function loginToCloud(username: string, password: string, deviceId: string) {
  const urlBase = GOOGLE_SCRIPT_URL ? GOOGLE_SCRIPT_URL.trim() : "";
  if (!urlBase) throw new Error("Chưa cấu hình GOOGLE_SCRIPT_URL.");

  try {
    const response = await fetch(urlBase, {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username,
        password,
        deviceId
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });
    
    const text = await response.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("Lỗi xác thực Google.");
    }
    const result = JSON.parse(text);
    
    if (result.success) {
      currentUser = username;
      localStorage.setItem('tkb_username', username);
      cleanLegacyUnscopedStorage();
    }
    return result;
  } catch (error: any) {
    console.error("Lỗi đăng nhập:", error);
    throw new Error(error.message || "Không thể kết nối đến máy chủ.");
  }
}

export async function loadFromCloud(sheetName: string) {
  const urlBase = GOOGLE_SCRIPT_URL ? GOOGLE_SCRIPT_URL.trim() : "";
  if (!urlBase) {
    console.warn("Chưa cấu hình GOOGLE_SCRIPT_URL. Tạm thời chạy ở chế độ Offline.");
    return null;
  }
  if (!currentUser) throw new Error("Bạn chưa đăng nhập.");
  
  try {
    const response = await fetch(urlBase, {
      method: 'POST',
      body: JSON.stringify({
        action: 'get',
        username: currentUser,
        sheetName
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });
    
    const text = await response.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error("Lỗi xác thực Google.");
    }
    
    const data = JSON.parse(text);
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error: any) {
    console.error("Lỗi khi tải từ cloud:", error);
    throw new Error(error.message || "Không thể kết nối tải dữ liệu từ Google Sheet.");
  }
}

export async function saveToCloud(sheetName: string, data: any[]) {
  const urlBase = GOOGLE_SCRIPT_URL ? GOOGLE_SCRIPT_URL.trim() : "";
  if (!urlBase) {
    throw new Error("Bạn chưa cài đặt GOOGLE_SCRIPT_URL trong code (file cloudApi.ts) để lưu lên Cloud.");
  }
  if (!currentUser) throw new Error("Bạn chưa đăng nhập.");
  
  try {
    const response = await fetch(urlBase, {
      method: 'POST',
      body: JSON.stringify({
        action: 'save',
        username: currentUser,
        sheetName,
        data
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });
    
    const text = await response.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      // Khi Google Apps Script quá tải hoặc mạng chập chờn, Google trả về trang HTML dù đã ghi dữ liệu vào Sheet
      console.warn("Google Apps Script returned HTML:", text.slice(0, 300));
      throw new Error("Đường truyền Google Sheet phản hồi chậm hoặc bị ngắt quãng. (Dữ liệu thường đã được lưu lên Google Sheet, bạn có thể kiểm tra lại).");
    }
    
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ.");
    }

    if (!result.success) throw new Error(result.error || "Lỗi không xác định từ Google Script");
    return result;
  } catch (error: any) {
    console.error("Lỗi khi lưu lên cloud:", error);
    throw new Error(error.message || "Không thể kết nối đến Google Sheet để lưu dữ liệu.");
  }
}
