import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import InvitationForm from './components/InvitationForm';
import LandingPage from './components/LandingPage';
import InvitationLoader from './components/InvitationLoader';
import AdminPage from './pages/admin';

function App() {
  return (
    <HelmetProvider>
      <div className="App bg-gray-50 min-h-screen">
        <Routes>
          {/* URL이 '/' (메인 주소)이면 LandingPage를 보여줍니다. */}
          <Route path="/" element={<LandingPage />} />
          
          {/* URL이 '/create' 이면 InvitationForm을 보여줍니다. */}
          <Route path="/create" element={<InvitationForm />} />

          {/* 관리자 페이지 */}
          <Route path="/admin" element={<AdminPage />} />

          {/* 
            URL이 '/minkyuyoonjou' 처럼 동적인 주소이면 InvitationLoader를 보여줍니다.
            ':invitationId' 부분이 'minkyuyoonjou' 같은 값을 받아내는 변수 역할을 합니다.
          */}
          <Route path="/invitation/:invitationId" element={<InvitationLoader />} />
        </Routes>
        <Analytics />
      </div>
    </HelmetProvider>
  );
}

export default App;