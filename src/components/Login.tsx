import React, { useState, useEffect } from 'react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { loginToCloud } from '../utils/cloudApi';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    // Lấy DeviceID thông qua FingerprintJS
    const getDeviceId = async () => {
      try {
        const fp = await fpPromise.load();
        const result = await fp.get();
        // Thêm tiền tố HWID_ để phân biệt rõ ràng đây là Hardware ID
        setDeviceId("HWID_" + result.visitorId);
      } catch (err) {
        console.error("Không thể lấy Device ID:", err);
        setDeviceId("UNKNOWN_DEVICE_" + Math.random().toString(36).substring(7));
      }
    };
    getDeviceId();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }
    if (!deviceId) {
      setError("Đang khởi tạo mã định danh thiết bị, vui lòng đợi...");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await loginToCloud(username, password, deviceId);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Đăng nhập TKB PRO 2.0</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input 
            type="text" 
            placeholder="Tài khoản" 
            className="login-input" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Mật khẩu" 
            className="login-input" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="login-error">{error}</div>}
          
          <div className="device-id-box">
             Mã thiết bị của bạn: <span className="device-id-text">{deviceId || "Đang lấy mã..."}</span>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
