import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { InvitationData, Story } from '../types';
import StoryViewer from './StoryViewer';
import { messageSets } from '../data/messages';

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
    navigate('/');
  }, [navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-serif text-lg">청첩장 정보를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen font-serif text-lg text-red-500">{error}</div>;
  }
  
  if (isPreloading) {
    return <div className="flex items-center justify-center min-h-screen font-serif text-lg">사진을 불러오는 중...</div>;
  }

  const stories = createStories;
  if (stories.length === 0) {
    return <div className="flex items-center justify-center min-h-screen font-serif text-lg text-red-500">청첩장 정보를 표시할 수 없습니다.</div>;
  }

  return (
    <StoryViewer 
      stories={stories}
      invitationData={formData!}
      onClose={handleCloseViewer}
    />
  );
};

export default InvitationLoader;