import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// AdSense 스크립트 실행
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const LandingPage: React.FC = () => {
  // 사용자 언어 감지 (한국어인지 확인)
  const isKorean = navigator.language.startsWith('ko');

  // AdSense 광고 로드
  useEffect(() => {
    try {
      if (window.adsbygoogle && window.adsbygoogle.length === 0) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>무료 모바일 청첩장 제작 | 디지털 청첩장 만들기</title>
        <meta name="description" content="무료로 모바일 청첩장을 제작하세요. 사진 업로드, 지도 연동, 실시간 수정이 가능한 디지털 청첩장 서비스입니다." />
        <meta name="keywords" content="모바일청첩장, 청첩장제작, 디지털청첩장, 무료청첩장, 결혼청첩장, 온라인청첩장" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      <div className="w-full flex flex-col items-center font-serif" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="w-full text-center py-16 md:py-20 px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
          {isKorean ? '결혼을 축하드립니다' : 'Congratulations on Your Wedding'}
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          {isKorean 
            ? '두 분의 가장 특별한 날을 위한 모바일 청첩장을 만들어보세요.' 
            : 'Create a mobile wedding invitation for your special day.'}
        </p>
        <div className="flex flex-col gap-4 items-center">
          <Link 
            to="/gildonggilsoon" 
            className="inline-block bg-white text-gray-800 font-bold py-3 px-10 rounded-full shadow-lg border border-gray-200 hover:bg-gray-100 transition-transform transform hover:scale-105 text-lg"
          >
            💌 {isKorean ? '청첩장 샘플 보기' : 'View Sample'}
          </Link>
          <Link 
            to="/create" 
            className="inline-block text-white font-bold py-3 px-10 rounded-full shadow-lg hover:opacity-90 transition-transform transform hover:scale-105 text-lg" style={{ backgroundColor: '#8C7B70' }}
          >
            💌 {isKorean ? '초대장 만들러 가기' : 'Create Invitation'}
          </Link>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-0">
        <div className="flex flex-col items-center">
          <img 
            src={isKorean ? "/mainPage1.png" : "/mainPage1_eng.png"}
            alt="모바일 청첩장 첫인상 소개" 
            className="w-full" 
          />
          <img 
            src={isKorean ? "/mainPage2.png" : "/mainPage2_eng.png"}
            alt="모바일 청첩장 감성 스토리 소개" 
            className="w-full" 
          />
          <img 
            src={isKorean ? "/mainPage3.png" : "/mainPage3_eng.png"}
            alt="모바일 청첩장 기능 소개" 
            className="w-full" 
          />
        </div>
      </div>
      
      {/* Google AdSense - 디스플레이 광고 */}
      <div className="w-full flex justify-center py-8" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-5xl w-full px-4">
          <ins className="adsbygoogle"
               style={{ display: 'block' }}
               data-ad-client="ca-pub-7718490524225342"
               data-ad-slot="7402985821"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>
      </div>
    </div>
    </>
  );
};

export default LandingPage;