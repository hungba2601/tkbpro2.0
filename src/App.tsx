import { useState, useEffect } from 'react';
import { Sidebar, type TabType } from './components/Sidebar';
import { DataSection } from './components/DataSection';
import { ApiConfig } from './components/ApiConfig';
import { TimetableSection } from './components/TimetableSection';
import { HomeSection } from './components/HomeSection';
import Login from './components/Login';
import { getCurrentUser } from './utils/cloudApi';
import { ErrorBoundary } from 'react-error-boundary';
import './App.css';

function ErrorFallback({error, resetErrorBoundary}: any) {
  return (
    <div role="alert" style={{ padding: '20px', color: 'red' }}>
      <p>Something went wrong:</p>
      <pre style={{ color: 'red' }}>{error.message}</pre>
      <button onClick={resetErrorBoundary} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Try again</button>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('Trang chủ');
  const [mountedTabs, setMountedTabs] = useState<Set<TabType>>(new Set(['Trang chủ']));
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!getCurrentUser());

  useEffect(() => {
    setMountedTabs(prev => {
      const newSet = new Set(prev);
      newSet.add(activeTab);
      return newSet;
    });
  }, [activeTab]);

  const dataTabs: TabType[] = ['Lớp học', 'Giáo viên', 'GVCN', 'Môn học', 'Phòng học', 'Phân công', 'Ràng buộc', 'Xếp TKB'];

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <div className="content-wrapper glass-card">
          <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => { window.location.reload(); }}>
            {activeTab === 'Trang chủ' && <HomeSection />}
            {dataTabs.map(tab => (
              mountedTabs.has(tab) && (
                <div key={tab} style={{ display: activeTab === tab ? 'block' : 'none' }}>
                  {tab === 'Xếp TKB' ? <TimetableSection /> : <DataSection title={tab} sheetName={tab} />}
                </div>
              )
            ))}
            {activeTab === 'Cấu hình API' && <ApiConfig />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
