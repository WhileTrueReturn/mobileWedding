import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { doc, setDoc, getDoc, runTransaction, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from '../firebase';
import type { InvitationData, AccountInfo, TransportationInfo, Story } from '../types';
import { messageSets } from '../data/messages';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import StoryViewer from './StoryViewer';

const SMARTSTORE_PRODUCT_URL = 'https://smartstore.naver.com/mobilewedding/products/12894854339';

interface OrderInfo {
  productOrderId: string;
  productId: string;
  ordererName?: string;
  status: string;
}

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
  const SMARTSTORE_PRODUCT_URL = 'https://smartstore.naver.com/mobilewedding/products/12894854339';

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
    photoTexts: [],
  });
  const [images, setImages] = useState<File[]>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const expirationDays = 90; // 고정값 90일

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const draggedItem = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const latestQuery = useRef('');

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [orderError, setOrderError] = useState<string | React.ReactNode | null>(null);
  const [orderChecking, setOrderChecking] = useState(false);
  const [orderVerified, setOrderVerified] = useState(false);

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
    
    // 사진이 변경되면 photoTexts 초기화 (첫 번째 사진 제외)
    if (images.length > 1) {
      const newPhotoTexts = Array.from({ length: images.length - 1 }, (_, index) => ({
        text: formData.photoTexts[index]?.text || '',
        fontSize: formData.photoTexts[index]?.fontSize || 32,
        fontFamily: formData.photoTexts[index]?.fontFamily || 'Noto Serif KR',
      }));
      setFormData(prev => ({ ...prev, photoTexts: newPhotoTexts }));
    }
    
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [images]);

  const createStories = useMemo((): (Story | { type: 'finalPage'; id: number; })[] => {
    if (!formData.groomName || images.length < 6 || images.length > 10) return [];
    
    // 미리보기용이므로, File 객체로 임시 URL을 생성합니다.
    const imageUrls = images.map(file => URL.createObjectURL(file));

    const stories: Story[] = [];
    const getParentsLine = (father: string, mother: string) => [father, mother].filter(Boolean).join(' · ');
    const groomParents = getParentsLine(formData.groomFatherName, formData.groomMotherName);
    const brideParents = getParentsLine(formData.brideFatherName, formData.brideMotherName);
    const groomLine = groomParents ? `${groomParents}의 아들` : '';
    const brideLine = brideParents ? `${brideParents}의 딸` : '';
    
    // 전체 글자 크기 (첫 번째 photoText의 fontSize 사용)
    const globalFontSize = formData.photoTexts[0]?.fontSize || 32;
    const globalFontFamily = formData.photoTexts[0]?.fontFamily || 'Noto Serif KR';
    
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
    formData.photoTexts.forEach((photoText, index) => {
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
  }, [formData, images]);
  
  const openPromoModal = () => {
    setOrderError(null);
    setOrderIdInput('');
    setOrderInfo(null);
    setOrderVerified(false);
    setPromoModalOpen(true);
  };

  const closePromoModal = () => {
    if (orderChecking) return;
    setPromoModalOpen(false);
  };

  const handleCheckOrder = async () => {
    if (!orderIdInput.trim()) {
      setOrderError('주문번호를 입력해주세요.');
      return;
    }

    setOrderChecking(true);
    setOrderError(null);

    try {
      // Check if order is approved by admin
      const approvedOrdersRef = collection(db, 'approvedOrders');
      const approvedSnapshot = await getDocs(approvedOrdersRef);
      
      let foundOrder: any = null;
      approvedSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.productOrderId === orderIdInput.trim()) {
          foundOrder = { id: doc.id, ...data };
        }
      });
      
      if (!foundOrder) {
        setOrderError(
          <span>
            등록되지 않은 주문번호입니다.{' '}
            <a
              href="https://talk.naver.com/ct/w01kgaf?frm=psf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              네이버 톡톡으로 문의하기
            </a>
          </span>
        );
        setOrderInfo(null);
        setOrderVerified(false);
        return;
      }
      
      if (foundOrder.used) {
        setOrderError('이미 사용된 주문번호입니다.');
        setOrderInfo(null);
        setOrderVerified(false);
        return;
      }
      
      // Success
      setOrderInfo({
        productOrderId: foundOrder.productOrderId,
        productId: '',
        ordererName: '',
        status: 'approved',
      });
      setOrderVerified(true);
      setOrderError(null);
    } catch (error) {
      console.error('주문 조회 오류:', error);
      setOrderError('주문 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setOrderInfo(null);
      setOrderVerified(false);
    } finally {
      setOrderChecking(false);
    }
  };

  const handleConfirmAndCreate = async () => {
    if (!orderVerified || !orderInfo) {
      setOrderError('먼저 주문을 조회해주세요.');
      return;
    }

    setPromoModalOpen(false);
    await handleCreateUrl(orderInfo.productOrderId);
  };

  const handleCreateUrl = async (productOrderId: string) => {
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
      // 이미지 압축 옵션 (5MB → 300KB 목표)
      const compressionOptions = {
        maxSizeMB: 0.3, // 300KB
        maxWidthOrHeight: 1920, // 최대 해상도
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };

      // 이미지 압축 및 업로드
      const uploadedImageUrls = await Promise.all(
        images.map(async (imageFile) => {
          // 이미지 압축
          const compressedFile = await imageCompression(imageFile, compressionOptions);
          console.log(`압축 완료: ${imageFile.name} - ${(imageFile.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
          
          // Firebase Storage에 업로드 (Cache-Control 메타데이터 추가)
          const imageRef = ref(storage, `invitations/${invitationId}/${uuidv4()}`);
          const metadata = {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000', // 1년 캐싱
          };
          await uploadBytes(imageRef, compressedFile, metadata);
          return await getDownloadURL(imageRef);
        })
      );

      const dataToSave: InvitationData = {
        ...formData,
        imageUrls: uploadedImageUrls,
        createdAt: Date.now(),
        expiresAt: Date.now() + (expirationDays * 24 * 60 * 60 * 1000), // 선택한 일수만큼 유효
        productOrderId,
      };
      
      const docRef = doc(db, "invitations", invitationId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existingData = docSnap.data() as InvitationData;
        
        // 만료된 청첩장이면 확인 없이 덮어쓰기
        const isExpired = existingData.expiresAt && Date.now() > existingData.expiresAt;
        
        if (!isExpired && !window.confirm("이미 같은 이름으로 만들어진 청첩장이 있습니다. 덮어쓰시겠습니까?")) {
          setIsUploading(false);
          return;
        }
      }
      
      // 주문 사용 기록 + 청첩장 저장을 트랜잭션으로 묶어 중복 방지
      await runTransaction(db, async (tx) => {
        // Find the approved order document
        const approvedOrdersRef = collection(db, 'approvedOrders');
        const q = query(approvedOrdersRef, where('productOrderId', '==', productOrderId));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error('등록되지 않은 주문번호입니다.');
        }
        
        const approvedOrderDoc = snapshot.docs[0];
        const approvedOrderData = approvedOrderDoc.data();
        
        if (approvedOrderData.used) {
          throw new Error('이미 사용된 주문번호입니다.');
        }

        // Save invitation
        tx.set(docRef, dataToSave);
        
        // Mark order as used
        tx.update(approvedOrderDoc.ref, {
          used: true,
          usedAt: Date.now(),
          invitationId,
        });
      });

      const expirationText = expirationDays === 0.002083 ? '3분' : `${expirationDays}일`;
      const url = `${window.location.origin}/invitation/${invitationId}`;
      
      // 자동으로 클립보드에 복사
      try {
        await navigator.clipboard.writeText(url);
        alert(`청첩장이 생성되었습니다!\n\n✅ 주소가 자동으로 복사되었습니다!\n${url}\n\n유효기간: ${expirationText}`);
      } catch (clipboardError) {
        console.error('클립보드 복사 실패:', clipboardError);
        alert(`청첩장이 생성되었습니다!\n\n아래 주소를 복사해주세요:\n${url}\n\n유효기간: ${expirationText}`);
      }

    } catch (e) {
      console.error("Error adding document: ", e);
      const message = e instanceof Error ? e.message : '청첩장 생성 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestCreateUrl = async () => {
    // 기존 버튼의 disabled 조건을 그대로 존중
    if (!hasPreviewed || isUploading) return;
    openPromoModal();
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
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    const limit = 5 * 1024 * 1024; // 5MB

    // 최대 10장 체크
    if (images.length + newFiles.length > 10) {
      alert(`최대 10장까지만 추가할 수 있습니다. (현재: ${images.length}장, 추가 시도: ${newFiles.length}장)`);
      e.target.value = '';
      return;
    }

    // 각 파일 크기 체크
    for (const file of newFiles) {
      if (file.size > limit) {
        alert(`'${file.name}' 파일의 용량이 너무 큽니다. (최대 5MB)\n업로드 시 자동으로 압축됩니다.`);
        e.target.value = ''; 
        return;
      }
    }
    
    setImages(prev => [...prev, ...newFiles]);
    e.target.value = ''; // 같은 파일을 다시 선택할 수 있도록
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImageUp = (index: number) => {
    if (index === 0) return;
    
    setImages(prev => {
      const newImages = [...prev];
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      return newImages;
    });
    
    // photoTexts도 함께 순서 변경
    if (index >= 1 && formData.photoTexts.length > 0) {
      setFormData(prev => {
        const newPhotoTexts = [...prev.photoTexts];
        // 첫 번째 이미지는 photoTexts에 없으므로 index-1로 매핑
        const textIndex1 = index - 1;
        const textIndex2 = index - 2;
        
        if (textIndex2 >= 0 && textIndex1 < newPhotoTexts.length) {
          [newPhotoTexts[textIndex2], newPhotoTexts[textIndex1]] = [newPhotoTexts[textIndex1], newPhotoTexts[textIndex2]];
        }
        return { ...prev, photoTexts: newPhotoTexts };
      });
    }
  };

  const moveImageDown = (index: number) => {
    if (index === images.length - 1) return;
    
    setImages(prev => {
      const newImages = [...prev];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      return newImages;
    });
    
    // photoTexts도 함께 순서 변경
    if (formData.photoTexts.length > 0) {
      setFormData(prev => {
        const newPhotoTexts = [...prev.photoTexts];
        // 첫 번째 이미지는 photoTexts에 없으므로 index-1로 매핑
        const textIndex1 = index - 1;
        const textIndex2 = index;
        
        if (textIndex1 >= 0 && textIndex2 < newPhotoTexts.length) {
          [newPhotoTexts[textIndex1], newPhotoTexts[textIndex2]] = [newPhotoTexts[textIndex2], newPhotoTexts[textIndex1]];
        }
        return { ...prev, photoTexts: newPhotoTexts };
      });
    }
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
      <Helmet>
        <title>모바일 청첩장 만들기 | 무료 디지털 청첩장 제작</title>
        <meta name="description" content="간편하게 모바일 청첩장을 제작하세요. 사진, 지도, 계좌번호를 추가하고 고유 URL을 받아보세요." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8" style={{ backgroundColor: '#F8F9FA' }}>
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
                <legend className="font-semibold px-2 text-gray-700">사진 선택 ({images.length}/10)</legend>
                <div className="mb-4">
                  <label className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-gray-400 transition-colors" style={{ borderColor: '#8C7B70' }}>
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">클릭하여 사진 추가 (여러 장 선택 가능)</p>
                      <p className="text-xs text-gray-400">최소 6장, 최대 10장 (각 10MB 이하)</p>
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
                
                {images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">📷 선택된 사진 ({images.length}장)</p>
                    {imagePreviews.map((src, index) => (
                      <div
                        key={`image-${index}-${images[index]?.name}`}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveImageUp(index);
                            }}
                            disabled={index === 0}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveImageDown(index);
                            }}
                            disabled={index === images.length - 1}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ↓
                          </button>
                        </div>
                        
                        <div className="flex-shrink-0 w-14 h-14 rounded overflow-hidden bg-gray-200">
                          <img src={src} alt={`${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center">
                          <p className="text-base font-semibold text-gray-700">{index + 1}번째 사진</p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </fieldset>

            {/* 사진별 텍스트 입력 */}
            {images.length > 1 && (
              <fieldset className="border p-4 rounded-lg">
                <legend className="font-semibold px-2 text-gray-700">사진별 텍스트 설정</legend>
                <p className="text-sm text-gray-600 mb-4">첫 번째 사진은 초대 정보가 표시되며, 나머지 사진에 대한 텍스트와 글자 크기를 설정할 수 있습니다.</p>
                
                {/* 전체 글자 크기 설정 */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-semibold text-blue-900">전체 글자 크기</label>
                        <span className="text-sm font-bold text-blue-900">{formData.photoTexts[0]?.fontSize || 32}px</span>
                      </div>
                      <input
                        type="range"
                        min="16"
                        max="64"
                        value={formData.photoTexts[0]?.fontSize || 32}
                        onChange={(e) => {
                          const newSize = parseInt(e.target.value);
                          const newPhotoTexts = formData.photoTexts.map(pt => ({ ...pt, fontSize: newSize }));
                          setFormData(prev => ({ ...prev, photoTexts: newPhotoTexts }));
                        }}
                        className="w-full"
                      />
                      <p className="text-xs text-blue-700 mt-1">모든 사진의 글자 크기를 동일하게 설정합니다</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-blue-900 block mb-1">전체 폰트</label>
                      <select
                        value={formData.photoTexts[0]?.fontFamily || 'Noto Serif KR'}
                        onChange={(e) => {
                          const newFont = e.target.value;
                          const newPhotoTexts = formData.photoTexts.map(pt => ({ ...pt, fontFamily: newFont }));
                          setFormData(prev => ({ ...prev, photoTexts: newPhotoTexts }));
                        }}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="Noto Serif KR">Noto Serif KR (명조체)</option>
                        <option value="Noto Sans KR">Noto Sans KR (고딕체)</option>
                        <option value="Gowun Batang">고운 바탕</option>
                        <option value="Gowun Dodam">고운 도담</option>
                        <option value="Nanum Myeongjo">나눔명조</option>
                        <option value="Nanum Gothic">나눔고딕</option>
                        <option value="Black Han Sans">Black Han Sans (강한체)</option>
                        <option value="Stylish">Stylish (스타일리시)</option>
                        <option value="Sunflower">Sunflower (해바라기)</option>
                        <option value="Gamja Flower">Gamja Flower (감자꽃)</option>
                      </select>
                      <p className="text-xs text-blue-700 mt-1">모든 사진의 폰트를 동일하게 설정합니다</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {formData.photoTexts.map((photoText, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-700 text-sm">{index + 2}번째 사진</span>
                        {imagePreviews[index + 1] && (
                          <img src={imagePreviews[index + 1]} alt={`preview ${index + 1}`} className="w-10 h-10 object-cover rounded" />
                        )}
                      </div>
                      <textarea
                        placeholder="이 사진에 표시될 텍스트를 입력하세요"
                        value={photoText.text}
                        onChange={(e) => {
                          const newPhotoTexts = [...formData.photoTexts];
                          newPhotoTexts[index] = { ...newPhotoTexts[index], text: e.target.value };
                          setFormData(prev => ({ ...prev, photoTexts: newPhotoTexts }));
                        }}
                        rows={3}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

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
                  className="w-full text-white p-3 rounded-lg font-bold text-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: '#8C7B70' }}
                >
                  미리보기
                </button>

                 <button 
                    type="button" 
                    onClick={() => {
                      if (!hasPreviewed) {
                        alert('미리보기로 1회 이상 확인한 후, 신중하게 생성해주세요.');
                        return;
                      }
                      handleRequestCreateUrl();
                    }}
                    disabled={isUploading}
                    className="w-full text-white p-3 rounded-lg font-bold text-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isUploading ? undefined : '#8C7B70' }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '1'; }}
                  >
                    {isUploading ? '이미지 압축 및 업로드 중... 잠시만 기다려주세요' : 'URL 생성 및 복사'}
                </button>
            </div>
          </div>
        </div>
      </main>

      {promoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">주문 확인</h3>
            <p className="mt-2 text-sm text-gray-600">
              네이버 스마트스토어에서 구매 후 받은 주문번호를 입력해주세요.
            </p>

            <div className="mt-4">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="주문번호 (예: 2024010112345678)"
                className="w-full rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-gray-400 focus:outline-none"
                disabled={orderChecking || orderVerified}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !orderVerified) {
                    e.preventDefault();
                    handleCheckOrder();
                  }
                }}
              />
              {orderError && (
                <p className="mt-2 text-sm text-red-600">{orderError}</p>
              )}
              {orderVerified && (
                <div className="mt-2 rounded-md bg-green-50 p-3">
                  <p className="text-sm font-semibold text-green-800">✓ 주문 확인 완료</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href={SMARTSTORE_PRODUCT_URL}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-center font-semibold text-gray-800 hover:bg-gray-50"
              >
                스마트스토어에서 구매하기
              </a>

              {!orderVerified ? (
                <button
                  type="button"
                  onClick={handleCheckOrder}
                  disabled={orderChecking}
                  className="w-full rounded-lg p-3 font-bold text-white disabled:bg-gray-300"
                  style={{ backgroundColor: orderChecking ? undefined : '#8C7B70' }}
                >
                  {orderChecking ? '조회 중...' : '주문 조회'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmAndCreate}
                  className="w-full rounded-lg p-3 font-bold text-white"
                  style={{ backgroundColor: '#8C7B70' }}
                >
                  URL 생성
                </button>
              )}

              <button
                type="button"
                onClick={closePromoModal}
                disabled={orderChecking}
                className="w-full rounded-lg bg-gray-100 p-3 font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}


      {viewerVisible && (
        <StoryViewer 
          stories={createStories}
          invitationData={formData}
          onClose={handleCloseViewer}
          onRestart={() => {}}
          isPreviewMode={true}
        />
      )}
    </>
  );
};

export default InvitationForm;