import { useState, useEffect } from 'react';
import { Key, Sparkles, ShieldCheck, ExternalLink, Check, X, Loader2 } from 'lucide-react';
import {
  AI_MODELS,
  getStoredApiKey,
  setStoredApiKey,
  getStoredAiModel,
  setStoredAiModel,
  testGeminiApiKey
} from '../utils/aiDiagnostic';
import './ApiConfig.css';

export function ApiConfig() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setApiKey(getStoredApiKey());
    setModel(getStoredAiModel());
  }, []);

  const currentModelObj = AI_MODELS.find(m => m.id === model) || AI_MODELS[1];

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'Vui lòng nhập API Key trước khi kiểm tra.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(apiKey, model);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Lỗi kiểm tra kết nối API' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      alert('Vui lòng nhập API Key trước khi lưu.');
      return;
    }
    setStoredApiKey(apiKey.trim());
    setStoredAiModel(model);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="api-config-section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Cấu hình Google Gemini AI</h1>
          <p className="section-subtitle">Tùy chọn API Key và Mô hình AI xử lý logic xếp thời khóa biểu và tìm lỗi tự động.</p>
        </div>
      </div>

      <div className="config-card glass-card">
        {/* Chọn Model */}
        <div className="form-group">
          <div className="api-form-label-row">
            <label className="api-form-label">
              <span className="label-icon-box">▣</span>
              <span>MÔ HÌNH AI XỬ LÝ (AI MODEL)</span>
            </label>
            <span className="api-default-badge">
              MẶC ĐỊNH: GEMINI 3.6 FLASH
            </span>
          </div>

          <div className="api-select-wrapper">
            <select 
              className="glass-input select-input api-modal-select" 
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setTestResult(null);
              }}
            >
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <p className="api-model-desc">{currentModelObj.description}</p>
        </div>

        {/* Nhập API Key */}
        <div className="form-group">
          <label className="api-form-label">
            <Key size={16} style={{ color: '#f59e0b' }} />
            <span>GOOGLE GEMINI API KEY</span>
          </label>
          <div className="api-input-wrapper">
            <input 
              type="password" 
              className="glass-input api-modal-input" 
              placeholder="Nhập Google API Key của bạn (ví dụ: AIzaSy...)"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
            />
            {apiKey && (
              <button
                type="button"
                className="api-input-clear-btn"
                onClick={() => {
                  setApiKey('');
                  setTestResult(null);
                }}
              >
                Xóa
              </button>
            )}
          </div>
          <div className="api-security-note">
            <ShieldCheck size={16} className="security-icon" />
            <span>API Key được bảo mật tuyệt đối và lưu trữ cục bộ (Local Storage) trên trình duyệt của bạn.</span>
          </div>
        </div>

        {/* Hướng dẫn lấy API Key */}
        <div className="api-guide-box">
          <div className="api-guide-header">
            <span className="api-guide-title">Chưa có API Key?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="api-guide-link"
            >
              Lấy API Key miễn phí <ExternalLink size={13} style={{ marginLeft: 3 }} />
            </a>
          </div>
          <ol className="api-guide-steps">
            <li>Truy cập Google AI Studio và tạo tài khoản Google.</li>
            <li>Nhấn "Create API key" và dán mã khóa vào ô trên.</li>
          </ol>
          <div className="api-guide-note">
            * Lưu ý: Nếu không có API Key, hệ thống vẫn xếp TKB bình thường bằng thuật toán heuristic chuẩn Bộ GD&ĐT.
          </div>
        </div>

        {/* Kết quả test API */}
        {testResult && (
          <div className={`api-test-alert ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? <Check size={18} /> : <X size={18} />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Nút thao tác */}
        <div className="action-area api-actions-flex">
          <button 
            type="button"
            className="api-btn-test"
            onClick={handleTestKey}
            disabled={isTesting || !apiKey.trim()}
          >
            {isTesting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Kiểm tra {currentModelObj.shortName}</span>
              </>
            )}
          </button>

          <button 
            type="button"
            className="api-btn-save"
            onClick={handleSaveConfig}
          >
            <Check size={18} />
            <span>Lưu cấu hình</span>
          </button>
        </div>
        
        {saveSuccess && (
          <div className="success-message glass-card" style={{ marginTop: '16px' }}>
            ✅ Đã lưu cấu hình Google Gemini API thành công!
          </div>
        )}
      </div>
    </div>
  );
}
