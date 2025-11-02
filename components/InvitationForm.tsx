import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../firebase';
import type { InvitationData, AccountInfo, TransportationInfo, Story } from '../types';
import { messageSets } from '../data/messages';
import { v4 as uuidv4 } from 'uuid';
import StoryViewer from './StoryViewer';

// TypeScript가 window 객체에 kakao 속성이 있을 수 있음을 인지하도록 합니다.
declare global {
  interface Window {
    kakao: any;
  }
}

// 이 파일에서만 사용할 날짜 포맷 함수를 정의합니다.
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${week}요일`;
};

const InvitationForm: React.FC = () => {
  const [formData, setFormData] = useState<InvitationData>({
    groomName: '', brideName: '',
    groomEnglishLastName: '', groomEnglishFirstName: '',
    brideEnglishLastName: '', brideEnglishFirstName: '',
    groomFatherName: '', groomMotherName: '',
    brideFatherName: '', brideMotherName: '',
    weddingDate: '', weddingTime: '12:00', weddingLocation: '', weddingHall: '',
    weddingAddress: '',
    weddingLat: null,
    weddingLng: null,
    transportationInfos: [],
    messageSetId: 'romantic',
    accounts: [],
    imageUrls: [],
  });
  const [images, setImages] = useState<File[]>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const draggedItem = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const latestQuery = useRef('');

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      const query = latestQuery.current;
      if (!query.trim() || !window.kakao?.maps?.services) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(query, (data: any[], status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setSearchResults(data);
          setShowResults(true);
        } else {
          setSearchResults([]);
        }
      });
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [images]);

  const createStories = useMemo((): (Story | { type: 'finalPage'; id: number; })[] => {
    if (!formData.groomName || images.length < 6 || images.length > 10) return [];
    
    const imageUrls = images.map(file => URL.createObjectURL(file));
    const selectedMessageSet = messageSets.find(set => set.id === formData.messageSetId);
    
    const messages = selectedMessageSet ? selectedMessageSet.messages[images.length] : [];
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
  }, [formData, images]);
  
  const handleCreateUrl = async () => {
    if (images.length < 6 || images.length > 10) {
      alert(`사진은 최소 6장, 최대 10장까지 선택해야 합니다.\n(현재 ${images.length}장 선택됨)`);
      return;
    }
    const { groomEnglishFirstName, brideEnglishFirstName } = formData;
    if (!groomEnglishFirstName || !brideEnglishFirstName) {
      alert('신랑과 신부의 영문 이름(First Name)을 모두 입력해주세요.');
      return;
    }

    setIsUploading(true);

    const sanitizeName = (name: string) => name.trim().toLowerCase().replace(/[^a-z]/g, '');
    const groomPath = sanitizeName(groomEnglishFirstName);
    const bridePath = sanitizeName(brideEnglishFirstName);
    const invitationId = `${groomPath}${bridePath}`;

    try {
      const uploadedImageUrls = await Promise.all(
        images.map(async (imageFile) => {
          const imageRef = ref(storage, `invitations/${invitationId}/${uuidv4()}`);
          await uploadBytes(imageRef, imageFile);
          return await getDownloadURL(imageRef);
        })
      );

      const dataToSave: InvitationData = {
        ...formData,
        imageUrls: uploadedImageUrls,
      };
      
      const docRef = doc(db, "invitations", invitationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        if (!window.confirm("이미 같은 이름으로 만들어진 청첩장이 있습니다. 덮어쓰시겠습니까?")) {
          setIsUploading(false);
          return;
        }
      }
      
      await setDoc(docRef, dataToSave);

      const url = `${window.location.origin}/${invitationId}`;
      navigator.clipboard.writeText(url).then(() => {
          alert(`청첩장이 생성되었습니다!\n\n아래 주소가 복사되었습니다:\n${url}`);
      });

    } catch (e) {
      console.error("Error adding document: ", e);
      alert("청첩장 생성 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handlePreview = () => {
    if (images.length < 6 || images.length > 10) {
      alert(`사진은 최소 6장, 최대 10장까지 선택해야 합니다.\n(현재 ${images.length}장 선택됨)`);
      return;
    }
    setHasPreviewed(true);
    setViewerVisible(true);
  };

  const handleCloseViewer = useCallback(() => {
    setViewerVisible(false);
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === 'number' && value !== '' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };
  
  const handleSelectPlace = (place: any) => {
    setFormData(prev => ({
      ...prev,
      weddingLocation: place.place_name,
      weddingAddress: place.road_address_name || place.address_name,
      weddingLat: parseFloat(place.y),
      weddingLng: parseFloat(place.x),
    }));
    setSearchQuery(place.place_name);
    setShowResults(false);
    setSearchResults([]);
  };

  const handleAccountChange = (id: string, field: keyof Omit<AccountInfo, 'id'>, value: string) => {
    setFormData(prev => ({ ...prev, accounts: prev.accounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc) }));
  };

  const addAccount = () => {
    setFormData(prev => ({ ...prev, accounts: [...prev.accounts, { id: uuidv4(), type: 'groom', relationship: '', name: '', bankName: '', accountNumber: '' }] }));
  };

  const removeAccount = (id: string) => {
    setFormData(prev => ({ ...prev, accounts: prev.accounts.filter(acc => acc.id !== id) }));
  };

  const handleTransportationChange = (id: string, field: keyof Omit<TransportationInfo, 'id'>, value: string) => {
    setFormData(prev => ({
      ...prev,
      transportationInfos: prev.transportationInfos.map(info => info.id === id ? { ...info, [field]: value } : info)
    }));
  };

  const addTransportationInfo = () => {
    setFormData(prev => ({ ...prev, transportationInfos: [...(prev.transportationInfos || []), { id: uuidv4(), title: '', description: '' }] }));
  };

  const removeTransportationInfo = (id: string) => {
    setFormData(prev => ({ ...prev, transportationInfos: prev.transportationInfos.filter(info => info.id !== id) }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    const limit = 5 * 1024 * 1024;

    if (files.length < 6 || files.length > 10) {
      alert(`사진은 최소 6장, 최대 10장까지 선택할 수 있습니다.\n(현재 ${files.length}장 선택됨)`);
      e.target.value = '';
      return;
    }

    for (const file of files) {
      if (file.size > limit) {
        alert(`'${file.name}' 파일의 용량이 너무 큽니다. (최대 5MB)`);
        e.target.value = ''; 
        return;
      }
    }
    setImages(files);
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItem.current = index;
    e.currentTarget.style.opacity = '0.5';
  };
  
  const handleDrop = (index: number) => {
    if (draggedItem.current !== null && draggedItem.current !== index) {
      const newImages = [...images];
      const draggedImage = newImages.splice(draggedItem.current, 1)[0];
      newImages.splice(index, 0, draggedImage);
      setImages(newImages);
    }
    draggedItem.current = null;
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  };
  
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
          const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          timeOptions.push(time);
      }
  }

  return (
    <>
      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto p-6 md:p-8 bg-white shadow-lg rounded-xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 font-serif">모바일 청첩장 만들기</h1>
          <div className="space-y-8">
            <fieldset className="border p-4 rounded-lg">
              <legend className="font-semibold px-2 text-gray-700">신랑측 정보</legend>
              <div className="space-y-3">
                <input type="text" name="groomName" placeholder="신랑 이름" value={formData.groomName} onChange={handleChange} className="w-full p-2 border rounded" required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="groomEnglishLastName" placeholder="영문 성 (Last Name)" value={formData.groomEnglishLastName} onChange={handleChange} className="w-full p-2 border rounded" />
                  <input type="text" name="groomEnglishFirstName" placeholder="영문 이름 (First Name)" value={formData.groomEnglishFirstName} onChange={handleChange} className="w-full p-2 border rounded" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="groomFatherName" placeholder="아버님 성함 (선택)" value={formData.groomFatherName} onChange={handleChange} className="w-full p-2 border rounded" />
                  <input type="text" name="groomMotherName" placeholder="어머님 성함 (선택)" value={formData.groomMotherName} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
              </div>
            </fieldset>
            
            <fieldset className="border p-4 rounded-lg">
              <legend className="font-semibold px-2 text-gray-700">신부측 정보</legend>
              <div className="space-y-3">
                <input type="text" name="brideName" placeholder="신부 이름" value={formData.brideName} onChange={handleChange} className="w-full p-2 border rounded" required />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="brideEnglishLastName" placeholder="영문 성 (Last Name)" value={formData.brideEnglishLastName} onChange={handleChange} className="w-full p-2 border rounded" />
                  <input type="text" name="brideEnglishFirstName" placeholder="영문 이름 (First Name)" value={formData.brideEnglishFirstName} onChange={handleChange} className="w-full p-2 border rounded" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" name="brideFatherName" placeholder="아버님 성함 (선택)" value={formData.brideFatherName} onChange={handleChange} className="w-full p-2 border rounded" />
                  <input type="text" name="brideMotherName" placeholder="어머님 성함 (선택)" value={formData.brideMotherName} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
              </div>
            </fieldset>
            
            <fieldset className="border p-4 rounded-lg">
                <legend className="font-semibold px-2 text-gray-700">예식 정보</legend>
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" name="weddingDate" value={formData.weddingDate} onChange={handleChange} className="w-full p-2 border rounded" required />
                        <select name="weddingTime" value={formData.weddingTime} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                            {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                        </select>
                    </div>
                    
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">예식 장소 (자동 검색)</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              latestQuery.current = e.target.value;
                            }}
                            placeholder="장소 이름 입력 (예: 더채플앳논현)"
                            className="w-full p-2 border rounded"
                        />
                        {showResults && (
                            <ul className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {searchResults.map(place => (
                                    <li key={place.id} onClick={() => handleSelectPlace(place)} className="p-3 hover:bg-gray-100 cursor-pointer text-sm">
                                        <p className="font-semibold">{place.place_name}</p>
                                        <p className="text-gray-500">{place.road_address_name || place.address_name}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {formData.weddingLocation && (
                        <div className="p-3 bg-gray-50 rounded-md text-sm border">
                            <p><strong>선택된 장소:</strong> {formData.weddingLocation}</p>
                            <p className="text-gray-600">{formData.weddingAddress}</p>
                        </div>
                    )}

                    <input type="text" name="weddingHall" placeholder="층 / 홀 (예: 6층 라포레홀)" value={formData.weddingHall} onChange={handleChange} className="w-full p-2 border rounded" />
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-lg">
                <legend className="font-semibold px-2 text-gray-700">오시는 길 안내 (선택)</legend>
                <div className="space-y-4">
                    {(formData.transportationInfos || []).map((info) => (
                        <div key={info.id} className="bg-gray-50 p-3 rounded-md border relative">
                            <button type="button" onClick={() => removeTransportationInfo(info.id)} className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xl">&times;</button>
                            <div className="space-y-2">
                                <input type="text" placeholder="제목 (예: 지하철 안내)" value={info.title} onChange={(e) => handleTransportationChange(info.id, 'title', e.target.value)} className="w-full p-2 border rounded" />
                                <textarea placeholder="내용 (예: 9호선 언주역 3번 출구 도보 5분)" value={info.description} onChange={(e) => handleTransportationChange(info.id, 'description', e.target.value)} rows={3} className="w-full p-2 border rounded" />
                            </div>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addTransportationInfo} className="w-full mt-4 bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 text-sm">+ 교통편 정보 추가하기</button>
            </fieldset>
            
            <fieldset className="border p-4 rounded-lg">
                <legend className="font-semibold px-2 text-gray-700">사진 선택</legend>
                <input type="file" multiple accept="image/*" onChange={handleImageChange} className="w-full p-2 border rounded text-sm" />
                <p className="text-xs text-gray-500 mt-2">최소 6장, 최대 10장까지 선택 가능합니다. (각 5MB 이하)</p>
                 <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {imagePreviews.map((src, index) => (
                        <div
                            key={src}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(index)}
                            onDragEnd={handleDragEnd}
                            className="aspect-square bg-gray-200 rounded overflow-hidden cursor-move"
                        >
                            <img src={src} alt={`preview ${index}`} className="w-full h-full object-cover pointer-events-none"/>
                        </div>
                    ))}
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-lg">
                <legend className="font-semibold px-2 text-gray-700">인사말 스타일</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {messageSets.map(set => (
                      <label key={set.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="messageSetId" value={set.id} checked={formData.messageSetId === set.id} onChange={handleChange} className="form-radio" />
                        {set.name}
                      </label>
                    ))}
                </div>
            </fieldset>

            <fieldset className="border p-4 rounded-lg">
              <legend className="font-semibold px-2 text-gray-700">마음 전하실 곳</legend>
              <div className="space-y-4">
                {formData.accounts.map((acc) => (
                  <div key={acc.id} className="bg-gray-50 p-3 rounded-md border relative">
                    <button type="button" onClick={() => removeAccount(acc.id)} className="absolute top-1 right-1 text-gray-400 hover:text-red-500 text-xl">&times;</button>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <select value={acc.type} onChange={(e) => handleAccountChange(acc.id, 'type', e.target.value)} className="p-2 border rounded bg-white col-span-2">
                            <option value="groom">신랑측</option>
                            <option value="bride">신부측</option>
                        </select>
                        <input type="text" placeholder="관계 (예: 아버지)" value={acc.relationship} onChange={(e) => handleAccountChange(acc.id, 'relationship', e.target.value)} className="p-2 border rounded"/>
                        <input type="text" placeholder="예금주" value={acc.name} onChange={(e) => handleAccountChange(acc.id, 'name', e.target.value)} className="p-2 border rounded" />
                        <input type="text" placeholder="은행명" value={acc.bankName} onChange={(e) => handleAccountChange(acc.id, 'bankName', e.target.value)} className="p-2 border rounded" />
                        <input type="text" placeholder="계좌번호" value={acc.accountNumber} onChange={(e) => handleAccountChange(acc.id, 'accountNumber', e.target.value)} className="p-2 border rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addAccount} className="w-full mt-4 bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300 text-sm">+ 추가하기</button>
            </fieldset>

            <div className="space-y-3">
                <button 
                  type="button" 
                  onClick={handlePreview}
                  className="w-full bg-pink-500 text-white p-3 rounded-lg font-bold text-lg hover:bg-pink-600 transition-colors"
                >
                  미리보기
                </button>
                 <button 
                    type="button" 
                    onClick={handleCreateUrl}
                    disabled={!hasPreviewed || isUploading}
                    className="w-full bg-green-500 text-white p-3 rounded-lg font-bold text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed enabled:hover:bg-green-600"
                  >
                  {isUploading ? '사진 업로드 및 생성 중...' : '청첩장 URL 생성하기'}
                </button>
            </div>
          </div>
        </div>
      </main>

      {viewerVisible && (
        <StoryViewer 
          stories={createStories}
          invitationData={formData}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
};

export default InvitationForm;