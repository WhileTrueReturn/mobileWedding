import React from 'react';

export interface Story {
  id: number;
  imageUrl: string;
  content: React.ReactNode;
  duration?: number;
}

export interface MessageSet {
  id: string;
  name: string;
  messages: string[];
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
  // ★★★★★ 변경점: 사진의 웹 주소 배열을 저장할 필드 추가 ★★★★★
  imageUrls: string[];
}