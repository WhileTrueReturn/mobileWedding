import React from 'react';

export interface Story {
  id: number;
  imageUrl: string;
  content: React.ReactNode;
  duration?: number;
}

// ★★★★★ 변경점: MessageSet의 구조를 완전히 변경합니다. ★★★★★
export interface MessageSet {
  id: string;
  name: string;
  // messages가 이제 사진 개수(6~10)를 key로 갖는 객체가 됩니다.
  messages: {
    [key: number]: string[];
  };
}

export interface AccountInfo {
  id: string;
  type: 'groom' | 'bride';
  relationship: string;
  name: string;
  bankName: string;
  accountNumber: string;
}

export interface TransportationInfo {
  id: string;
  title: string;
  description: string;
}

export interface InvitationData {
  groomName: string;
  brideName: string;
  groomEnglishLastName: string;
  groomEnglishFirstName: string;
  brideEnglishLastName: string;
  brideEnglishFirstName: string;
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
  weddingDate: string;
  weddingTime: string;
  weddingLocation: string;
  weddingHall: string;
  weddingAddress: string;
  weddingLat: number | null;
  weddingLng: number | null;
  transportationInfos: TransportationInfo[];
  messageSetId: string;
  accounts: AccountInfo[];
  imageUrls: string[];
}