import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { InvitationData, Story } from '../types';
import StoryViewer from './StoryViewer';
import { messageSets } from '../data/messages';

// ★★★★★ BGM 전역 타입 선언 ★★★★★
declare global {
  interface Window {
    bgmAudio?: HTMLAudioElement;
  }
}

// 펜 글씨 로딩 애니메이션 컴포넌트
const ElegantLoadingScreen: React.FC<{ isFinished: boolean; onAnimationEnd: () => void }> = ({ isFinished, onAnimationEnd }) => {
  const words = ['Wedding', 'Invitation'];
  useEffect(() => {
    if (!isFinished) return;
    // 총 애니메이션 시간 계산 및 화면 전환 트리거
    const totalLetters = words.join('').length;
    const totalDuration = totalLetters * 90 + (words.length - 1) * 400 + 600;
    const t = setTimeout(onAnimationEnd, totalDuration);
    return () => clearTimeout(t);
  }, [isFinished, onAnimationEnd, words]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#FCFBF9] via-[#F5F2EE] to-[#EDE8E3] z-50" role="alert" aria-live="polite" aria-label="Wedding invitation loading">
      <div className="text-center select-none">
        <div className="overflow-hidden">
          {words.map((w, wi) => (
            <div key={w} className="mb-3 last:mb-0">
              {w.split('').map((ch, ci) => {
                const indexSoFar = w.split('').slice(0, ci).length + words.slice(0, wi).join('').length;
                const delay = indexSoFar * 90 + wi * 400;
                return (
                  <span
                    key={ci}
                    style={{ animationDelay: `${delay}ms` }}
                    className="inline-block opacity-0 translate-y-3 text-[42px] md:text-[64px] font-light tracking-[0.04em] text-[#5f4631] handwriting-letter"
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-6 text-[13px] tracking-[0.35em] text-[#9c8874] font-medium fade-in-after" style={{ animationDelay: `${words.join('').length * 90 + (words.length - 1) * 400}ms` }}>LOADING…</div>
      </div>
      <style>
        {`
        @keyframes handwritingAppear {0%{opacity:0;transform:translateY(12px) scale(1.02);}70%{opacity:.85;}100%{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes subtleFade {0%{opacity:0}100%{opacity:0.95}}
        .handwriting-letter{font-family:'Cormorant Garamond', 'Times New Roman', serif;animation:handwritingAppear 620ms cubic-bezier(.24,.76,.32,1.05) forwards;}
        .fade-in-after{opacity:0;animation:subtleFade 900ms ease forwards;font-family:'Cormorant Garamond', serif;}
        @media (prefers-reduced-motion: reduce){
          .handwriting-letter, .fade-in-after{animation:none;opacity:1;transform:none;}
        }
        `}
      </style>
    </div>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${week}요일`;
};

const preloadImages = (urls: string[]): Promise<any> => {
  const promises = urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = resolve; 
    });
  });
  return Promise.all(promises);
};

const InvitationLoader: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<InvitationData | null>(null);
  const [isPreloading, setIsPreloading] = useState(true);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerKey, setViewerKey] = useState(0);
  
  // ★★★★★ BGM 로딩 페이지부터 재생 (한 번만!) ★★★★★
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ★★★★★ 컴포넌트 마운트 시 BGM 시작 (전역으로 한 번만) ★★★★★
  useEffect(() => {
    // 이미 재생 중인 BGM이 있는지 확인
    if (window.bgmAudio) {
      audioRef.current = window.bgmAudio;
      return;
    }

    const audio = new Audio('/bgm.mp3');
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    window.bgmAudio = audio; // 전역으로 저장

    // 로딩 페이지부터 BGM 재생 시도
    audio.play().catch(err => {
      console.log('자동 재생 실패:', err);
    });

    // 언마운트 시 정리하지 않음 (계속 재생)
  }, []);

  useEffect(() => {
    if (!invitationId) {
      setError("잘못된 접근입니다.");
      setLoading(false);
      return;
    }

    const fetchAndPreload = async () => {
      try {
        const docRef = doc(db, "invitations", invitationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as InvitationData;
          
          // 만료 시간 체크 및 자동 삭제
          if (data.expiresAt && Date.now() > data.expiresAt) {
            try {
              console.log(`만료된 청첩장 자동 삭제 시작: ${invitationId}`);
              
              // Storage에서 모든 이미지 삭제
              const storageRef = ref(storage, `invitations/${invitationId}`);
              const listResult = await listAll(storageRef);
              
              await Promise.all(
                listResult.items.map(itemRef => deleteObject(itemRef))
              );
              
              console.log(`Storage 이미지 삭제 완료: ${listResult.items.length}개`);
              
              // Firestore 문서 삭제
              await deleteDoc(docRef);
              console.log(`Firestore 문서 삭제 완료: ${invitationId}`);
              
            } catch (deleteError) {
              console.error('만료된 청첩장 삭제 중 오류:', deleteError);
            }
            
            setError("이 청첩장은 유효기간이 만료되었습니다.");
            setLoading(false);
            setIsPreloading(false);
            return;
          }
          
          setFormData(data);
          setLoading(false);

          if (data.imageUrls && data.imageUrls.length > 0) {
            await preloadImages(data.imageUrls);
          }
          setIsPreloading(false);
          
        } else {
          setError("해당 청첩장을 찾을 수 없습니다.");
          setLoading(false);
          setIsPreloading(false);
        }
      } catch (e) {
        setError("청첩장을 불러오는 중 오류가 발생했습니다.");
        console.error("Error fetching or preloading: ", e);
        setLoading(false);
        setIsPreloading(false);
      }
    };

    fetchAndPreload();
  }, [invitationId]);
  
  const createStories = useMemo((): (Story | { type: 'finalPage'; id: number; })[] => {
    if (!formData || !formData.imageUrls || formData.imageUrls.length < 6 || formData.imageUrls.length > 10) return [];
    
    const imageUrls = formData.imageUrls;
    const selectedMessageSet = messageSets.find(set => set.id === formData.messageSetId);

    const messages = selectedMessageSet ? selectedMessageSet.messages[imageUrls.length] : [];
    if (!messages) return [];

    const stories: Story[] = [];
    const getParentsLine = (father: string, mother: string) => [father, mother].filter(Boolean).join(' · ');
    const groomParents = getParentsLine(formData.groomFatherName, formData.groomMotherName);
    const brideParents = getParentsLine(formData.brideFatherName, formData.brideMotherName);
    const groomLine = groomParents ? `${groomParents}의 아들` : '';
    const brideLine = brideParents ? `${brideParents}의 딸` : '';
    
    // 전체 글자 크기 (첫 번째 photoText의 fontSize 사용)
    const globalFontSize = formData.photoTexts?.[0]?.fontSize || 32;
    const globalFontFamily = formData.photoTexts?.[0]?.fontFamily || 'Noto Serif KR';
    
    stories.push({
      id: 1,
      imageUrl: imageUrls[0],
      content: (
        <div className="bg-black/30 backdrop-blur-sm px-6 py-4 rounded-xl text-white text-center max-w-full" style={{ textShadow: '0px 2px 4px rgba(0, 0, 0, 0.7)', fontFamily: globalFontFamily }}>
          <div className="text-center text-white w-full px-4">
            <h2 className="font-semibold mb-6 tracking-wider" style={{ fontSize: `${globalFontSize * 0.75}px` }}>초대합니다</h2>
            <div className="space-y-3 mb-6">
              <p style={{ fontSize: `${globalFontSize * 0.5}px` }}>{groomLine && <span>{groomLine} </span>}<span className="font-bold" style={{ fontSize: `${globalFontSize * 0.56}px` }}>신랑 {formData.groomName}</span></p>
              <p style={{ fontSize: `${globalFontSize * 0.5}px` }}>{brideLine && <span>{brideLine} </span>}<span className="font-bold" style={{ fontSize: `${globalFontSize * 0.56}px` }}>신부 {formData.brideName}</span></p>
            </div>
            <div className="w-24 h-px bg-white/70 mx-auto my-6"></div>
            <div className="font-medium space-y-1" style={{ fontSize: `${globalFontSize * 0.56}px` }}>
                <p>{formatDate(formData.weddingDate)}</p>
                <p>{formData.weddingTime}</p>
                <p className="mt-2 font-semibold tracking-wide">{formData.weddingLocation}</p>
                {formData.weddingHall && <p className="font-normal" style={{ fontSize: `${globalFontSize * 0.5}px` }}>{formData.weddingHall}</p>}
            </div>
          </div>
        </div>
      )
    });
  
    // 2번째 사진부터 사용자가 입력한 텍스트 사용
    (formData.photoTexts || []).forEach((photoText, index) => {
      const imageIndex = index + 1;
      if (imageIndex < imageUrls.length) {
        stories.push({
          id: index + 2,
          imageUrl: imageUrls[imageIndex],
          content: photoText.text ? (
            <div className="bg-black/30 backdrop-blur-sm px-6 py-4 rounded-xl text-white text-center max-w-full" style={{ textShadow: '0px 2px 4px rgba(0, 0, 0, 0.7)', fontFamily: photoText.fontFamily }}>
              <p 
                className="whitespace-pre-line" 
                style={{ fontSize: `${photoText.fontSize}px` }}
              >
                {photoText.text}
              </p>
            </div>
          ) : null,
        });
      }
    });
  
    const finalPage = { type: 'finalPage' as const, id: stories.length + 1 };
    
    return [...stories, finalPage];
  }, [formData]);

  // ★★★★★ 변경점: handleCloseViewer 함수 - 첫 페이지로 이동 ★★★★★
  const handleCloseViewer = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleRestart = useCallback(() => {
    setViewerKey(prevKey => prevKey + 1);
  }, []);
  
  if (error) {
    return <div className="flex items-center justify-center min-h-screen font-serif text-lg text-red-500">{error}</div>;
  }

  if (showStoryViewer && formData) {
    const stories = createStories;
    if (stories.length === 0) {
      return <div className="flex items-center justify-center min-h-screen font-serif text-lg text-red-500">청첩장 정보를 표시할 수 없습니다.</div>;
    }
    return (
      <StoryViewer 
        key={viewerKey}
        stories={stories}
        invitationData={formData}
        onClose={handleCloseViewer}
        onRestart={handleRestart}
        isPreviewMode={false}
      />
    );
  }
  
  return (
    <ElegantLoadingScreen
      isFinished={!loading && !isPreloading}
      onAnimationEnd={() => setShowStoryViewer(true)}
    />
  );
};

export default InvitationLoader;