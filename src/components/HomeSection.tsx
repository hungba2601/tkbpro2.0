import React, { useState, useEffect } from 'react';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { loadFromCloud, saveToCloud } from '../utils/cloudApi';
import { Save, Check, Loader2 } from 'lucide-react';
import './HomeSection.css';

export function HomeSection() {
  const [config, setConfig] = useState({
    schoolName: '',
    schoolYear: '',
    semester: '',
    timetableName: '',
    effectiveDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    // 1. Tải từ userStorage
    const saved = getUserItem('config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch(e) {}
    }

    // 2. Tải từ Cloud theo tài khoản
    const fetchCloudConfig = async () => {
      try {
        const cloudData = await loadFromCloud('Cấu hình');
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          const cfg = cloudData[0];
          const newCfg = {
            schoolName: cfg['Tên trường'] || cfg.schoolName || '',
            schoolYear: cfg['Năm học'] || cfg.schoolYear || '',
            semester: cfg['Học kỳ'] || cfg.semester || '',
            timetableName: cfg['Tên TKB'] || cfg.timetableName || '',
            effectiveDate: cfg['Thời gian áp dụng'] || cfg.effectiveDate || ''
          };
          setConfig(newCfg);
          setUserItem('config', JSON.stringify(newCfg));
        }
      } catch(e) {}
    };
    fetchCloudConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, [e.target.name]: e.target.value };
    setConfig(newConfig);
    setUserItem('config', JSON.stringify(newConfig));
  };

  const handleSaveToCloud = async () => {
    setSaving(true);
    try {
      setUserItem('config', JSON.stringify(config));
      const row = {
        'Tên trường': config.schoolName,
        'Năm học': config.schoolYear,
        'Học kỳ': config.semester,
        'Tên TKB': config.timetableName,
        'Thời gian áp dụng': config.effectiveDate
      };
      await saveToCloud('Cấu hình', [row]);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch(e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">
          TKB <span className="highlight">PRO 2.0</span>
        </h1>
        <p className="hero-subtitle">Hệ thống Xếp Thời Khóa Biểu Tự Động & Thông Minh</p>
      </div>

      <div className="config-section glass-card">
        <h2>Thông tin Header (Sử dụng khi Xuất Excel)</h2>
        <div className="config-grid">
          <div className="input-group">
            <label>Tên trường</label>
            <input 
              type="text" 
              name="schoolName" 
              value={config.schoolName} 
              onChange={handleChange} 
              placeholder="VD: THCS AN NHƠN"
            />
          </div>
          <div className="input-group">
            <label>Năm học</label>
            <input 
              type="text" 
              name="schoolYear" 
              value={config.schoolYear} 
              onChange={handleChange} 
              placeholder="VD: Năm học 2025 - 2026"
            />
          </div>
          <div className="input-group">
            <label>Học kỳ</label>
            <input 
              type="text" 
              name="semester" 
              value={config.semester} 
              onChange={handleChange} 
              placeholder="VD: Học kỳ 2"
            />
          </div>
          <div className="input-group">
            <label>Tên TKB (Số)</label>
            <input 
              type="text" 
              name="timetableName" 
              value={config.timetableName} 
              onChange={handleChange} 
              placeholder="VD: Số 3"
            />
          </div>
          <div className="input-group full-width">
            <label>Thời gian áp dụng</label>
            <input 
              type="text" 
              name="effectiveDate" 
              value={config.effectiveDate} 
              onChange={handleChange} 
              placeholder="VD: Thực hiện từ ngày 04 tháng 05 năm 2026"
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="glass-button primary-btn"
            onClick={handleSaveToCloud}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '15px' }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình lên Cloud'}</span>
          </button>
          {savedMsg && (
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
              <Check size={18} /> Đã lưu cấu hình trường học thành công!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
