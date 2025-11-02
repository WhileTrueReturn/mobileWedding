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
  // 장소의 전체 주소를 저장할 필드를 추가합니다.
  weddingAddress: string;
  weddingLat: number | null;
  weddingLng: number | null;
  transportationInfos: TransportationInfo[];
  messageSetId: string;
  accounts: AccountInfo[];
}