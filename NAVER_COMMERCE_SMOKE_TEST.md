# Naver Commerce API 스모크 테스트

이 문서는 **네이버 커머스(주문/결제) API를 폴링 방식으로 붙이기 전에**, 토큰 발급 및 1~2개 엔드포인트를 빠르게 확인하기 위한 **로컬 스모크 테스트**입니다.

## 보안 주의

- 채팅/깃/문서에 `client_secret`을 절대 붙여넣지 마세요.
- 이미 노출된 `client_secret`은 **즉시 재발급(회전)** 하세요.

## 준비: 환경변수 설정 (zsh)

아래는 예시입니다. 값은 본인 걸로 넣으세요.

### A) `.env.local`에 넣기 (추천)

`invite/.env.local`에 아래 키를 추가해두면, 스크립트가 자동으로 읽습니다.

```
NAVER_COMMERCE_CLIENT_ID=YOUR_CLIENT_ID
NAVER_COMMERCE_CLIENT_SECRET=YOUR_CLIENT_SECRET
NAVER_COMMERCE_TYPE=SELF
NAVER_COMMERCE_ACCOUNT_ID=YOUR_ACCOUNT_ID_IF_SELLER
NAVER_COMMERCE_BASE_URL=https://api.commerce.naver.com/external/v1
```

이후에는 `export` 없이 아래 커맨드만 실행하면 됩니다.

```zsh
cd /Users/parkminkyupark/Desktop/invite
npm run naver:token
```

### B) 터미널에서 `export`로 넣기

```zsh
cd /Users/parkminkyupark/Desktop/invite

export NAVER_COMMERCE_CLIENT_ID='YOUR_CLIENT_ID'
export NAVER_COMMERCE_CLIENT_SECRET='YOUR_CLIENT_SECRET'
# 기본값이 이미 맞으면 생략 가능
export NAVER_COMMERCE_BASE_URL='https://api.commerce.naver.com/external/v1'
```

## 1) 토큰 발급 확인

```zsh
npm run naver:token
```

- 성공하면 `access_token`이 일부 마스킹되어 출력됩니다.
- 실패(400/401 등)면 네이버가 내려주는 에러 메시지에 **누락 파라미터**가 포함되는 경우가 많습니다.

## 2) 변경 주문 조회 (last-changed-statuses)

시간 범위를 ISO-8601로 넣어 실행합니다(타임존 포함 권장).

```zsh
npm run naver:lastChanged -- --from='2026-01-03T00:00:00+09:00' --to='2026-01-03T23:59:59+09:00'
```

- 400이면 응답 메시지에 필요한 쿼리 파라미터가 추가로 나올 수 있습니다.

## 3) 주문 상세 조회 (product-orders/query)

`productOrderIds`를 콤마로 넣어 호출합니다.

```zsh
npm run naver:query -- --productOrderIds='1234567890,0987654321'
```

## 스크립트 위치

- `scripts/naver-commerce.mjs`

필요하면 다음 단계로 이 스크립트를 기반으로 **폴링 잡(크론) + Firestore 프로모코드 자동발급**까지 붙일 수 있습니다.
