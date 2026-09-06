import { useState, useEffect } from 'react';
import { Key, X, ShieldCheck, ExternalLink, Check, Sparkles, Loader2 } from 'lucide-react';
import {
  AI_MODELS,
  getStoredApiKey,
  setStoredApiKey,
  getStoredAiModel,
  setStoredAiModel,
  testGeminiApiKey
} from '../utils/aiDiagnostic';
import './ApiKeyModal.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (apiKey: string, modelId: string) => void;
  title?: string;
  subtitle?: string;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  onSaved,
  title = "Cấu hình Google Gemini API",
  subtitle = "Tùy chọn API Key và Mô hình AI xử lý kế hoạch giáo dục"
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setModel(getStoredAiModel());
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Vui lòng nhập API Key để lưu cấu hình.');
      return;
    }
    setStoredApiKey(apiKey.trim());
    setStoredAiModel(model);
    if (onSaved) {
      onSaved(apiKey.trim(), model);
    }
    onClose();
  };

  return (
    <div className="api-modal-overlay" onClick={onClose}>
      <div className="api-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="api-modal-header">
          <div className="api-modal-header-left">
            <div className="api-modal-key-icon">
              <Key size={20} />
            </div>
            <div>
              <h3 className="api-modal-title">{title}</h3>
              <p className="api-modal-subtitle">{subtitle}</p>
            </div>
          </div>
          <button className="api-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="api-modal-body">
          {/* Chọn Model */}
          <div className="api-form-group">
            <div className="api-form-label-row">
              <label className="api-form-label">
                <span className="label-icon-box">▣</span>
                MÔ HÌNH AI XỬ LÝ (AI MODEL)
              </label>
              <span className="api-default-badge">
                MẶC ĐỊNH: GEMINI 3.6 FLASH
              </span>
            </div>

            <div className="api-select-wrapper">
              <select
                className="api-modal-select"
                value={model}
                onChange={e => {
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
          <div className="api-form-group">
            <label className="api-form-label">
              GOOGLE GEMINI API KEY
            </label>

            <div className="api-input-wrapper">
              <input
                type="password"
                className="api-modal-input"
                placeholder="Nhập API Key của bạn (ví dụ: AIzaSy...)"
                value={apiKey}
                onChange={e => {
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
              <span>
                API Key được lưu trữ cục bộ (Local Storage) trên máy của bạn, không gửi qua máy chủ trung gian.
              </span>
            </div>
          </div>

          {/* Hộp hướng dẫn lấy API Key */}
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
              * Lưu ý: Nếu không có API Key, hệ thống vẫn hoạt động hoàn hảo với bộ dữ liệu mẫu chuẩn Bộ GD&ĐT.
            </div>
          </div>

          {/* Thông báo kết quả kiểm tra API */}
          {testResult && (
            <div className={`api-test-alert ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? <Check size={18} /> : <X size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="api-modal-footer">
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
            onClick={handleSave}
          >
            <Check size={16} />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </div>
    </div>
  );
}
