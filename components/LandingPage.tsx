import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const formText = `
[모바일 청첩장 제작 요청]

**- 기본 정보 -**
1. 신랑 한글 이름:
2. 신랑 영문 이름 (First Name):
3. 신부 한글 이름:
4. 신부 영문 이름 (First Name):

**- 혼주 정보 (선택 사항) -**
5. 신랑 아버님 성함:
6. 신랑 어머님 성함:
7. 신부 아버님 성함:
8. 신부 어머님 성함:

**- 예식 정보 -**
9. 예식 날짜 (예: 2025년 11월 1일):
10. 예식 시간 (예: 오후 2시 30분):
11. 예식 장소 이름 (예: 더채플앳논현):
12. 예식 장소 층/홀 (예: 6층 라포레홀):

**- 오시는 길 안내 (선택 사항) -**
13. (항목 1) 제목 (예: 지하철 안내):
14. (항목 1) 내용 (예: 9호선 언주역 3번 출구, 도보 5분):
15. (항목 2) 제목 (예: 주차 안내):
16. (항목 2) 내용 (예: 본 건물 지하 주차장 이용 가능 (2시간 무료)):
    * 필요한 만큼 항목을 추가하거나 삭제해서 보내주세요.

**- 계좌 정보 (선택 사항) -**
17. (신랑측 계좌 1) 관계 (예: 아버지):
18. (신랑측 계좌 1) 예금주:
19. (신랑측 계좌 1) 은행 및 계좌번호:
20. (신부측 계좌 1) 관계 (예: 어머니):
21. (신부측 계좌 1) 예금주:
22. (신부측 계좌 1) 은행 및 계좌번호:
    * 필요한 만큼 계좌 정보를 추가하거나 삭제해서 보내주세요.

**- 사진 및 기타 -**
23. 청첩장에 사용될 사진(6장~10장)은 이 DM과 함께 보내주세요.
24. 원하시는 인사말 스타일을 선택해주세요 (로맨틱 / 모던 / 전통):
25. 기타 특별한 요청사항:
  `;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formText.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full bg-gray-50 flex flex-col items-center font-serif">
      <div className="w-full text-center py-16 md:py-20 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          결혼을 축하드립니다
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          두 분의 가장 특별한 날을 위한 모바일 청첩장을 만들어보세요.
        </p>
        <Link 
          to="/gildonggilsoon" 
          className="inline-block bg-white text-gray-800 font-bold py-3 px-8 rounded-full shadow-md border border-gray-200 hover:bg-gray-100 transition-transform transform hover:scale-105"
        >
          💌 청첩장 샘플 보기
        </Link>
      </div>

      <div className="w-full max-w-5xl mx-auto px-0">
        <div className="flex flex-col items-center">
          <img 
            src="/mainPage1.png" 
            alt="모바일 청첩장 첫인상 소개" 
            className="w-full" 
          />
          <img 
            src="/mainPage2.png" 
            alt="모바일 청첩장 감성 스토리 소개" 
            className="w-full" 
          />
          <img 
            src="/mainPage3.png" 
            alt="모바일 청첩장 기능 소개" 
            className="w-full" 
          />
        </div>
      </div>
      
      <div className="w-full flex flex-col items-center text-center py-16 md:py-20 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white p-8 rounded-lg shadow-lg border text-left">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">제작 문의</h2>
            <p className="text-gray-600 mb-6">
              모바일 청첩장 제작을 원하시면, 아래 양식을 복사하여 담당자에게 DM으로 보내주세요.
            </p>
            <pre className="bg-gray-100 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {formText.trim()}
            </pre>
            {/* ★★★★★ 변경점: 버튼들을 감싸는 div 추가 및 인스타그램 버튼 추가 ★★★★★ */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleCopy}
                className="w-full bg-white text-[#8C7B70] border-2 border-[#8C7B70] p-3 rounded-lg font-bold text-lg hover:bg-[#FBF9F6] transition-colors"
              >
                {copied ? '✅ 복사 완료!' : '양식 복사하기'}
              </button>
              <a
                href="https://www.instagram.com/develop_live?igsh=MW8wcmV3b203YXFhOA=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-[#8C7B70] text-white p-3 rounded-lg font-bold text-lg hover:opacity-90 transition-opacity"
              >
                {/* SVG 아이콘은 그대로 유지 */}
                인스타그램으로 DM 보내기
              </a>
            </div>
            {/* ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★ */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;