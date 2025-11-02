import React, { useState, useMemo, useEffect, useCallback } from 'react';
import InvitationForm from './components/InvitationForm';
import StoryViewer from './components/StoryViewer';
import { messageSets } from './data/messages';
import type { InvitationData, Story, AccountInfo } from './types';
import { v4 as uuidv4 } from 'uuid';

// Helper functions for robust Base64 encoding/decoding
const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string) => {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

const decodeDataFromUrl = (encodedData: string): InvitationData | null => {
  try {
    const uint8Array = base64ToUint8Array(encodedData);
    const jsonString = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decoding data:", error);
    return null;
  }
};

const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => console.error('Copy failed', err));
    };

    return (
        <button
            onClick={handleCopy}
            className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
            {copied ? '복사됨!' : '복사'}
        </button>
    );
};

function App() {
  const [mode, setMode] = useState<'form' | 'viewer'>('form');
  const [formData, setFormData] = useState<InvitationData>({
    groomName: '', brideName: '',
    groomEnglishLastName: '', groomEnglishFirstName: '',
    brideEnglishLastName: '', brideEnglishFirstName: '',
    groomFatherName: '', groomMotherName: '',
    brideFatherName: '', brideMotherName: '',
    weddingDate: '', weddingTime: '12:00', weddingLocation: '', weddingHall: '',
    // 새로 추가된 필드들의 초기 상태를 설정합니다.
    weddingAddress: '',
    weddingLat: null,
    weddingLng: null,
    transportationInfos: [],
    messageSetId: 'romantic',
    accounts: [],
  });
  const [images, setImages] = useState<File[]>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);

  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const data = params.get('data');
      if (data) {
          const decodedData = decodeDataFromUrl(data);
          if (decodedData) {
              setFormData(decodedData);
              alert("공유된 청첩장 정보가 로드되었습니다. 사진을 다시 선택해주세요.");
          }
      }
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 ${week}요일`;
  };

  const createStories = useMemo((): (Story | { type: 'finalPage'; id: number; })[] => {
    if (!formData || images.length === 0) return [];
  
    const imageUrls = images.map(file => URL.createObjectURL(file));
    const selectedMessageSet = messageSets.find(set => set.id === formData.messageSetId);
    const messages = selectedMessageSet ? selectedMessageSet.messages : [];
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
      stories.push({
        id: index + 2,
        imageUrl: imageUrls[(index + 1) % imageUrls.length],
        content: <p className="text-2xl">{msg}</p>,
      });
    });
  
    const finalPageId = stories.length + 1;
    const finalPage = { type: 'finalPage' as const, id: finalPageId };
    
    return [...stories, finalPage];
  }, [formData, images]);

  const handlePreview = () => {
    if (images.length === 0) {
      alert('사진을 1장 이상 선택해주세요.');
      return;
    }
    setHasPreviewed(true);
    setMode('viewer');
  };

  const handleCreateUrl = () => {
    const dataToEncode = { ...formData };
    const jsonString = JSON.stringify(dataToEncode);
    const uint8Array = new TextEncoder().encode(jsonString);
    const encodedData = uint8ArrayToBase64(uint8Array);
    const url = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('청첩장 URL이 복사되었습니다!\n\n※ 사진은 URL에 포함되지 않아요. 링크를 받은 분이 청첩장을 보려면, 사진을 새로 선택해야 합니다.');
    }).catch(err => {
        console.error('URL 복사 실패:', err);
        alert('URL 복사에 실패했습니다.');
    });
  };

  const handleCloseViewer = useCallback(() => {
    setMode('form');
  }, []);

  return (
    <div className="App bg-gray-50 min-h-screen">
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        {mode === 'form' ? (
          <InvitationForm 
            formData={formData}
            setFormData={setFormData}
            images={images}
            setImages={setImages}
            onPreview={handlePreview} 
            onCreateUrl={handleCreateUrl}
            hasPreviewed={hasPreviewed}
          />
        ) : (
          <StoryViewer 
            stories={createStories}
            invitationData={formData}
            onClose={handleCloseViewer}
          />
        )}
      </main>
    </div>
  );
}

export default App;