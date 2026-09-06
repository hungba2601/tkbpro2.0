import './Sidebar.css';
import { 
  Home,
  Users, 
  UserCheck,
  School, 
  BookOpen, 
  CalendarDays, 
  ShieldAlert, 
  Settings,
  Play,
  LogOut,
  MonitorPlay
} from 'lucide-react';
import { getCurrentUser, logout } from '../utils/cloudApi';

export type TabType = 'Trang chủ' | 'Lớp học' | 'Giáo viên' | 'GVCN' | 'Môn học' | 'Phòng học' | 'Phân công' | 'Ràng buộc' | 'Xếp TKB' | 'Cấu hình API';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: 'Trang chủ', icon: <Home size={20} />, label: 'Trang chủ' },
    { id: 'Lớp học', icon: <School size={20} />, label: 'Lớp học' },
    { id: 'Giáo viên', icon: <Users size={20} />, label: 'Giáo viên' },
    { id: 'GVCN', icon: <UserCheck size={20} />, label: 'GVCN' },
    { id: 'Môn học', icon: <BookOpen size={20} />, label: 'Môn học' },
    { id: 'Phòng học', icon: <MonitorPlay size={20} />, label: 'Phòng học' },
    { id: 'Phân công', icon: <CalendarDays size={20} />, label: 'Phân công' },
    { id: 'Ràng buộc', icon: <ShieldAlert size={20} />, label: 'Ràng buộc' },
    { id: 'Xếp TKB', icon: <Play size={20} />, label: 'Xếp TKB' },
  ];

  return (
    <aside className="sidebar glass-card">
      <div className="sidebar-header">
        <h2 className="logo">TKB <span>PRO 2.0</span></h2>
        <div className="sidebar-author-badge">
          <div>MADE BY NGUYỄN PHI HÙNG</div>
          <div className="author-zalo">ZALO 0938750424</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id as TabType)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        
        <div className="nav-divider"></div>
        
        <button
          className={`nav-item settings-item ${activeTab === 'Cấu hình API' ? 'active' : ''}`}
          onClick={() => setActiveTab('Cấu hình API')}
        >
          <Settings size={20} />
          <span>Cấu hình API</span>
        </button>

        <div className="nav-divider"></div>
        <div className="current-user-info" style={{ padding: '0 20px', color: '#6366f1', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
           Xin chào, {getCurrentUser()}
        </div>
        <button
          className="nav-item settings-item"
          onClick={() => {
            logout();
            window.location.reload();
          }}
          style={{ color: '#ef4444' }}
        >
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
      </nav>
    </aside>
  );
}
