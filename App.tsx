import React from 'react';
import { Routes, Route } from 'react-router-dom';
import InvitationForm from './components/InvitationForm';
import LandingPage from './components/LandingPage';
import InvitationLoader from './components/InvitationLoader'; // InvitationLoader를 임포트합니다.

function App() {
  return (
    <div className="App bg-gray-50 min-h-screen">
      <Routes>
        {/* URL이 '/' (메인 주소)이면 LandingPage를 보여줍니다. */}
        <Route path="/" element={<LandingPage />} />
        
        {/* URL이 '/create' 이면 InvitationForm을 보여줍니다. */}
        <Route path="/create" element={<InvitationForm />} />

        {/* 
          URL이 '/minkyuyoonjou' 처럼 동적인 주소이면 InvitationLoader를 보여줍니다.
          ':invitationId' 부분이 'minkyuyoonjou' 같은 값을 받아내는 변수 역할을 합니다.
        */}
        <Route path="/:invitationId" element={<InvitationLoader />} />
      </Routes>
    </div>
  );
}

export default App;