# 🎉 모바일 청첩장 비용 최적화 완료

## ✅ 적용된 변경사항

### 1. 이미지 압축 시스템 구축
- **라이브러리**: `browser-image-compression` 설치
- **압축 설정**:
  - 목표 크기: 300KB (기존 5MB에서 94% 감소)
  - 최대 해상도: 1920px
  - 포맷: JPEG
  - 멀티스레딩: Web Worker 활용

### 2. 캐싱 전략 적용
- **Firebase Storage 메타데이터**:
  ```javascript
  cacheControl: 'public, max-age=31536000' // 1년 캐싱
  contentType: 'image/jpeg'
  ```
- **Vercel 헤더 설정**:
  - 정적 이미지: 1년 캐싱
  - HTML: 즉시 재검증

### 3. Google AdSense 통합
- **위치**: 랜딩 페이지 중간 (이미지 소개 후)
- **타입**: 반응형 디스플레이 광고
- **자동 로드**: useEffect로 페이지 로드 시 광고 삽입

### 4. 업로드 제한 완화
- 기존: 5MB → 변경: 10MB (압축 후 300KB로 저장)
- 사용자 경험 개선: 원본 품질 유지 + 전송 비용 절감

---

## 💰 예상 비용 절감 효과

### 시나리오: 청첩장 1개, 하객 100명 방문

| 항목 | 기존 | 개선 후 | 절감률 |
|------|------|---------|--------|
| **사진 1장 크기** | 5MB | 300KB | 94% ↓ |
| **총 이미지 크기 (10장)** | 50MB | 3MB | 94% ↓ |
| **100명 첫 방문 데이터** | 5GB | 300MB | 94% ↓ |
| **재방문 데이터** | 5GB | 0MB (캐시) | 100% ↓ |
| **Firebase 비용** | $0.48 (650원) | $0.03 (40원) | **92% ↓** |
| **AdSense 수익** | $0.05-0.1 (70-140원) | $0.05-0.1 (70-140원) | - |
| **순손익** | -580원 | **+30원 흑자** | ✅ |

### 추가 절감 요인
- 재방문 시 캐시 활용 → 추가 데이터 전송 없음
- 청첩장 공유 시 OG 이미지만 전송 → 추가 비용 없음
- 모바일 데이터 절약 → 사용자 만족도 상승

---

## 🚀 추가 설정 필요 사항

### 1. Google AdSense 설정
1. [Google AdSense](https://www.google.com/adsense) 계정 생성
2. 사이트 등록: `www.mobilewedding.kr`
3. 승인 대기 (1-2주)
4. 승인 후:
   - `index.html`의 `YOUR_PUBLISHER_ID`를 실제 ID로 교체
   - `LandingPage.tsx`의 `YOUR_AD_SLOT_ID`를 실제 광고 슬롯 ID로 교체

### 2. Firebase Storage 규칙 업데이트
Firebase Console → Storage → Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /invitations/{invitationId}/{imageId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3. Vercel 배포
```bash
cd /Users/parkminkyupark/Desktop/invite
npm run build
vercel --prod
```

---

## 📊 모니터링 지표

### Firebase Console에서 확인
- **Storage**: 일일 다운로드 대역폭
- **Firestore**: 읽기/쓰기 횟수
- **Hosting**: 트래픽 분석

### Google AdSense에서 확인
- **페이지 RPM**: 1,000 페이지뷰당 수익
- **클릭률(CTR)**: 광고 클릭 비율
- **일일 수익**: 실제 수입 추적

---

## 🎯 향후 개선 방안

### 단기 (1-2주)
- [ ] WebP 포맷 지원 (더 나은 압축률)
- [ ] 이미지 lazy loading
- [ ] 썸네일 생성 (리스트 화면용)

### 중기 (1-2개월)
- [ ] Cloudflare CDN 도입
- [ ] 관리자 대시보드 (방문 통계)
- [ ] 방명록 기능 (+ 광고 추가)

### 장기 (3개월+)
- [ ] 유료 프리미엄 플랜 (광고 제거)
- [ ] 템플릿 다양화
- [ ] AI 자동 레이아웃 생성

---

## 📝 체크리스트

배포 전 확인:
- [x] 이미지 압축 라이브러리 설치
- [x] Firebase Storage 메타데이터 설정
- [x] Vercel 캐싱 헤더 설정
- [x] AdSense 코드 삽입
- [ ] AdSense Publisher ID 교체
- [ ] Firebase Storage 규칙 업데이트
- [ ] 테스트 청첩장 생성 및 확인
- [ ] 모바일 환경 테스트
- [ ] 프로덕션 배포

---

## 🐛 문제 해결

### 이미지 압축이 너무 느린 경우
- `useWebWorker: true` 확인
- 압축 옵션 조정: `maxSizeMB: 0.5`로 완화

### 광고가 표시되지 않는 경우
- AdSense 승인 여부 확인
- 브라우저 애드블록 비활성화
- Publisher ID 정확성 확인
- 개발자 도구 콘솔 에러 확인

### 캐싱이 작동하지 않는 경우
- Firebase Storage 메타데이터 확인
- 브라우저 캐시 초기화 후 재테스트
- Vercel 배포 후 헤더 설정 확인
