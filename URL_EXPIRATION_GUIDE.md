# URL 만료 기능 설정 가이드

## 구현된 기능

1. **URL 생성 시 만료 기간 선택**
   - 3분 (테스트용)
   - 30일
   - 90일
   - 180일

2. **자동 삭제**
   - 만료된 URL 접속 시 에러 메시지 표시
   - 매일 자동으로 만료된 초대장 삭제 (Firebase Storage 이미지 + Firestore 문서)

## 배포 전 설정

### 1. API 키 생성
안전한 랜덤 키를 생성하세요:
```bash
# macOS/Linux
openssl rand -hex 32

# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Vercel 환경 변수 설정

Vercel 프로젝트 설정에서 환경 변수 추가:
1. Vercel Dashboard → 프로젝트 선택 → Settings → Environment Variables
2. 다음 환경 변수 추가:
   ```
   CLEANUP_API_KEY=위에서_생성한_랜덤_키
   ```
3. Production, Preview, Development 모두 체크

### 3. 배포
```bash
vercel --prod
```

## Cron 작업

`vercel.json`에 설정된 cron:
- **스케줄**: 매일 자정 (한국 시간 기준 오전 9시)
- **동작**: `/api/cleanup-expired` 엔드포인트 호출
- **처리**: 만료된 초대장의 이미지와 데이터 자동 삭제

## 테스트 방법

### 1. 3분 만료 테스트
1. 로컬 환경에서 초대장 생성
2. 만료 기간을 "3분 (테스트용)" 선택
3. URL 생성 후 3분 기다림
4. URL 접속 시 "초대장이 만료되었습니다" 메시지 확인

### 2. 수동 정리 테스트
```bash
# 로컬에서 테스트
curl -X POST http://localhost:3000/api/cleanup-expired \
  -H "x-api-key: your-secure-random-key-here-change-this"

# 배포 후 테스트
curl -X POST https://your-domain.vercel.app/api/cleanup-expired \
  -H "x-api-key: 실제_API_키"
```

## 주의사항

1. **API 키 보안**
   - `.env.local`의 API 키는 공유하지 마세요
   - Git에 커밋되지 않도록 `.gitignore`에 포함되어 있습니다
   - Vercel에는 별도의 안전한 키를 설정하세요

2. **Cron 제한**
   - Vercel Pro 플랜 이상에서만 Cron 작업 사용 가능
   - Hobby 플랜은 외부 cron 서비스 사용 필요 (GitHub Actions, cron-job.org 등)

3. **Firebase 권한**
   - Firebase Storage 삭제 권한 확인
   - Firestore 삭제 규칙 확인

## 문제 해결

### Cron이 동작하지 않는 경우
1. Vercel 플랜 확인 (Pro 이상)
2. Vercel Logs에서 cron 실행 로그 확인
3. API 키가 올바르게 설정되었는지 확인

### 삭제가 안 되는 경우
1. Firebase 콘솔에서 Storage Rules 확인
2. Firestore Rules 확인
3. `/api/cleanup-expired` 엔드포인트 직접 호출하여 로그 확인
