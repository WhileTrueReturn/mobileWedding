import React from 'react';

const LandingPage: React.FC = () => {
  const formText = `
    [모바일 청첩장 제작 요청]

    1. 신랑 이름:
    2. 신부 이름:
    3. 예식 날짜 및 시간:
    4. 예식 장소:
    5. 기타 요청사항:
  `;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center font-serif p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          결혼을 축하드립니다
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          두 분의 가장 특별한 날을 위한 모바일 청첩장을 만들어보세요.
        </p>
        
        <div className="bg-white p-8 rounded-lg shadow-lg border text-left">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">제작 문의</h2>
          <p className="text-gray-600 mb-6">
            모바일 청첩장 제작을 원하시면, 아래 양식을 복사하여 담당자에게 DM으로 보내주세요.
          </p>
          <pre className="bg-gray-100 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
            {formText.trim()}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(formText.trim())}
            className="w-full mt-6 bg-pink-500 text-white p-3 rounded-lg font-bold text-lg hover:bg-pink-600 transition-colors"
          >
            양식 복사하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;