import React, { useRef, useEffect, useState } from 'react';
import type { InvitationData, AccountInfo, TransportationInfo } from '../types';
import { messageSets } from '../data/messages';
import { v4 as uuidv4 } from 'uuid';

// TypeScript가 window 객체에 kakao 속성이 있을 수 있음을 인지하도록 합니다.
declare global {
  interface Window {
    kakao: any;
  }
}

interface InvitationFormProps {
  formData: InvitationData;
  setFormData: React.Dispatch<React.SetStateAction<InvitationData>>;
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  onPreview: () => void;
  onCreateUrl: () => void;
  hasPreviewed: boolean;
}

const InvitationForm: React.FC<InvitationFormProps> = ({ formData, setFormData, images, setImages, onPreview, onCreateUrl, hasPreviewed }) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const draggedItem = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // ★★★★★ 변경점 1: 항상 최신 검색어를 저장할 ref 생성 ★★★★★
  const latestQuery = useRef('');

  useEffect(() => {
    // 디바운싱 로직은 그대로 유지됩니다.
    const debounceTimer = setTimeout(() => {
      // ★★★★★ 변경점 2: state 대신 ref의 최신 값으로 검색 ★★★★★
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

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]); // useEffect의 트리거는 searchQuery state가 그대로 담당합니다.

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [images]);

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
    if (e.target.files) { setImages(Array.from(e.target.files)); }
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
                        // ★★★★★ 변경점 3: onChange에서 state와 ref를 함께 업데이트 ★★★★★
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
            <p className="text-xs text-gray-500 mt-2">사진을 드래그해서 순서를 바꿀 수 있습니다.</p>
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
              onClick={onPreview}
              className="w-full bg-pink-500 text-white p-3 rounded-lg font-bold text-lg hover:bg-pink-600 transition-colors"
            >
              미리보기
            </button>
             <button 
                type="button" 
                onClick={onCreateUrl}
                disabled={!hasPreviewed}
                className="w-full bg-green-500 text-white p-3 rounded-lg font-bold text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed enabled:hover:bg-green-600"
              >
              청첩장 URL 생성하기
            </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationForm;