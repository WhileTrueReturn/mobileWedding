import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { InvitationData, Story } from '../types';
import StoryViewer from './StoryViewer';
import { messageSets } from '../data/messages';

// ★★★★★ 변경점 1: 2단계 애니메이션을 처리하도록 로직 수정 ★★★★★
const ElegantLoadingScreen: React.FC<{ groomName?: string; brideName?: string; isFinished: boolean; onAnimationEnd: () => void }> = ({ groomName, brideName, isFinished, onAnimationEnd }) => {
  const [stage, setStage] = useState(0); // 0: 시작 전, 1: Intro, 2: 이름 표시, 3: 페이드아웃
  const [startAnimation, setStartAnimation] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트되자마자 즉시 Intro 애니메이션 시작
    const startTimer = setTimeout(() => {
      setStartAnimation(true);
      setStage(1);
    }, 100);

    if (isFinished) {
      // 데이터 로딩이 끝나면, 최소 2.5초를 기다린 후 이름 애니메이션으로 전환
      const stage2Timer = setTimeout(() => {
        setStage(2);
      }, 2500);
      
      // 이름 애니메이션 시작 후 3.5초 뒤에 페이드아웃 시작
      const stage3Timer = setTimeout(() => {
        setStage(3);
      }, 6000); // 2500ms + 3500ms
      
      // 전체 애니메이션 종료 후 화면 전환
      const endTimer = setTimeout(onAnimationEnd, 6500);

      return () => {
        clearTimeout(stage2Timer);
        clearTimeout(stage3Timer);
        clearTimeout(endTimer);
      };
    }
    return () => clearTimeout(startTimer);
  }, [isFinished, onAnimationEnd]);

  const showIntro = startAnimation && stage === 1;
  const showNames = startAnimation && stage === 2;

  return (
    <>
      <div className={`fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#FCFBF9] via-[#F5F2EE] to-[#EDE8E3] z-50 transition-opacity duration-500 ${stage === 3 ? 'opacity-0' : 'opacity-100'}`}>
        <div className="text-center font-light text-[#8C7B70] relative w-full h-[250px] flex items-center justify-center">

          {/* 1단계: Wedding Invitation */}
          <div className={`absolute transition-opacity duration-700 ease-in-out ${showIntro ? 'opacity-100' : 'opacity-0'}`}>
            <div 
              className={`transition-all duration-1000 ease-out ${showIntro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <h2 className="text-3xl md:text-4xl tracking-wider" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Wedding
              </h2>
            </div>
            <div 
              className={`transition-all duration-1000 ease-out mt-3 ${showIntro ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '1000ms' }}
            >
              <h2 className="text-3xl md:text-4xl tracking-wider" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Invitation
              </h2>
            </div>
          </div>

          {/* 2단계: 이름 및 문구 */}
          <div className={`absolute transition-opacity duration-700 ease-in-out ${showNames ? 'opacity-100' : 'opacity-0'}`}>
            <div 
              className={`transition-all duration-1000 ease-out ${showNames ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {groomName}
              </h2>
            </div>
            <div 
              className={`transition-all duration-1000 ease-out ${showNames ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '800ms' }}
            >
              <p className="text-xl my-4 text-[#D3C4B8]">♥</p>
            </div>
            <div 
              className={`transition-all duration-1000 ease-out ${showNames ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '1400ms' }}
            >
              <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {brideName}
              </h2>
            </div>
            <div 
              className={`transition-all duration-1000 ease-out mt-8 ${showNames ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
              style={{ transitionDelay: '2000ms' }}
            >
              <p className="text-base tracking-[0.2em]" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                우리 결혼합니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
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
    
    stories.push({
      id: 1,
      imageUrl: imageUrls[0],
      content: (
        <div className="text-center text-white w-full px-4">
          <h2 className="text-2xl font-semibold mb-6 tracking-wider">초대합니다</h2>
          <div className="space-y-3 mb-6">
            <p className="text-base">{groomLine && <span>{groomLine} </span>}<span className="font-bold text-lg">신랑 {formData.groomName}</span></p>
            <p className="text-base">{brideLine && <span>{brideLine} </span>}<span className="font-bold text-lg">신부 {formData.brideName}</span></p>
          </div>
          <div className="w-24 h-px bg-white/70 mx-auto my-6"></div>
          <div className="text-lg font-medium space-y-1">
              <p>{formatDate(formData.weddingDate)}</p>
              <p>{formData.weddingTime}</p>
              <p className="mt-2 font-semibold tracking-wide">{formData.weddingLocation}</p>
              {formData.weddingHall && <p className="text-base font-normal">{formData.weddingHall}</p>}
          </div>
        </div>
      )
    });
  
    messages.forEach((msg, index) => {
      const imageIndex = index + 1;
      stories.push({
        id: index + 2,
        imageUrl: imageUrls[imageIndex],
        content: <p className="text-2xl whitespace-pre-line">{msg}</p>,
      });
    });
  
    const finalPage = { type: 'finalPage' as const, id: stories.length + 1 };
    
    return [...stories, finalPage];
  }, [formData]);

  const handleCloseViewer = useCallback(() => {
    window.close();
  }, []);

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
      />
    );
  }
  
  return (
    <ElegantLoadingScreen
      groomName={formData?.groomName}
      brideName={formData?.brideName}
      isFinished={!loading && !isPreloading}
      onAnimationEnd={() => setShowStoryViewer(true)}
    />
  );
};

export default InvitationLoader;