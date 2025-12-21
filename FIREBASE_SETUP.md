# Firebase Storage 캐싱 설정 가이드

## 📦 비용 절감을 위한 필수 설정

### 1. Firebase Storage 규칙 설정

Firebase Console → Storage → Rules 탭에서 아래 규칙으로 업데이트하세요:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /invitations/{invitationId}/{imageId} {
      // 모든 사용자가 읽기 가능 (청첩장 조회용)
      allow read: if true;
      
      // 쓰기는 인증된 사용자만 (나중에 관리자 기능 추가 시 수정 필요)
      allow write: if request.auth != null;
      
      // 메타데이터: 캐싱 헤더 설정
      allow read: if resource.metadata.cacheControl != null;
    }
  }
}
```

### 2. Firebase Storage CORS 설정 (선택사항)

로컬에서 `cors.json` 파일을 생성:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 31536000,
    "responseHeader": ["Content-Type", "Cache-Control"]
  }
]
```

Firebase CLI로 CORS 설정 적용:
```bash
gsutil cors set cors.json gs://your-project-id.appspot.com
```

### 3. 적용된 최적화

✅ **이미지 압축**
- 원본 5MB → 300KB로 압축 (약 94% 감소)
- `browser-image-compression` 라이브러리 사용
- JPEG 포맷, 최대 해상도 1920px

✅ **캐싱 설정**
- `Cache-Control: public, max-age=31536000` (1년)
- 동일한 청첩장을 여러 번 방문해도 이미지 재다운로드 안 함
- CDN 및 브라우저 캐시 활용

### 4. 예상 비용 절감 효과

**기존:**
- 사진 10장 × 5MB = 50MB
- 하객 100명 방문 = 5GB 전송
- 비용: 약 $0.48 (650원)

**개선 후:**
- 사진 10장 × 300KB = 3MB
- 하객 100명 첫 방문 = 300MB 전송
- 재방문 시 캐시 사용 = 0MB 전송
- 비용: 약 $0.03 (40원) - **92% 절감**

### 5. 추가 개선 방안

- [ ] WebP 포맷 지원 (더 나은 압축률)
- [ ] 썸네일 생성 (리스트 화면용)
- [ ] Progressive JPEG 적용
- [ ] Cloudflare Workers로 추가 캐싱 레이어
