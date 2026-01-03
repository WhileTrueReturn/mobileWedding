import bcrypt from 'bcryptjs';

const BASE_URL = import.meta.env.VITE_NAVER_COMMERCE_BASE_URL || 'https://api.commerce.naver.com/external/v1';
const CLIENT_ID = import.meta.env.VITE_NAVER_COMMERCE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_NAVER_COMMERCE_CLIENT_SECRET;
const TYPE = import.meta.env.VITE_NAVER_COMMERCE_TYPE || 'SELF';
const ACCOUNT_ID = import.meta.env.VITE_NAVER_COMMERCE_ACCOUNT_ID || '';
const TARGET_PRODUCT_ID = import.meta.env.VITE_NAVER_COMMERCE_TARGET_PRODUCT_ID || '12894854339';

export interface OrderInfo {
  productOrderId: string;
  productId: string;
  productName?: string;
  ordererName?: string;
  orderDate?: string;
  status: string;
}

/**
 * 네이버 커머스 OAuth2 액세스 토큰 발급
 */
async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('네이버 커머스 API 키가 설정되지 않았습니다.');
    return null;
  }

  const timestamp = Date.now().toString();
  const password = `${CLIENT_ID}_${timestamp}`;
  
  // bcrypt 해싱 (CLIENT_SECRET을 salt로 사용)
  const hashed = bcrypt.hashSync(password, CLIENT_SECRET);
  const clientSecretSign = btoa(hashed); // Base64 인코딩

  const formData = new URLSearchParams();
  formData.set('client_id', CLIENT_ID);
  formData.set('timestamp', timestamp);
  formData.set('grant_type', 'client_credentials');
  formData.set('client_secret_sign', clientSecretSign);
  formData.set('type', TYPE);
  
  if (TYPE === 'SELLER' && ACCOUNT_ID) {
    formData.set('account_id', ACCOUNT_ID);
  }

  try {
    const response = await fetch(`${BASE_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`토큰 발급 실패 (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('토큰 발급 중 오류:', error);
    return null;
  }
}

/**
 * 주문번호로 주문 정보 조회
 */
export async function queryOrderByProductOrderId(productOrderId: string): Promise<OrderInfo | null> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('토큰 발급 실패');
  }

  try {
    const response = await fetch(`${BASE_URL}/pay-order/seller/product-orders/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productOrderIds: [productOrderId],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`주문 조회 실패 (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    const orders = result.data || [];

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];
    
    // 상품 ID 확인
    if (String(order.productId) !== TARGET_PRODUCT_ID) {
      console.warn(`주문 상품 ID(${order.productId})가 대상 상품(${TARGET_PRODUCT_ID})과 일치하지 않습니다.`);
      return null;
    }

    // 결제 완료 상태 확인
    const paidStatuses = ['PAYED', 'PAYMENT_DONE', 'DELIVER_READY', 'DELIVERING', 'DELIVERED'];
    if (!paidStatuses.includes(order.productOrderStatus)) {
      console.warn(`주문 상태(${order.productOrderStatus})가 결제 완료가 아닙니다.`);
      return null;
    }

    return {
      productOrderId: order.productOrderId,
      productId: order.productId,
      productName: order.productName,
      ordererName: order.ordererName,
      orderDate: order.orderDate,
      status: order.productOrderStatus,
    };
  } catch (error) {
    console.error('주문 조회 중 오류:', error);
    throw error;
  }
}

/**
 * 최근 주문 목록에서 특정 조건으로 검색 (선택적 기능)
 * 주문번호를 모르는 경우 네이버 ID나 구매자명으로 검색 가능
 */
export async function searchRecentOrders(days = 7): Promise<OrderInfo[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('토큰 발급 실패');
  }

  // 시간 범위 설정 (KST)
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const fromStr = past.toISOString().replace(/\.\d{3}Z$/, '+09:00');
  const toStr = now.toISOString().replace(/\.\d{3}Z$/, '+09:00');

  try {
    // 1) last-changed-statuses로 최근 변경된 주문 목록 조회
    const lastChangedUrl = `${BASE_URL}/pay-order/seller/product-orders/last-changed-statuses?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`;
    
    const response1 = await fetch(lastChangedUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response1.ok) {
      const errorText = await response1.text();
      console.error(`최근 주문 조회 실패 (${response1.status}):`, errorText);
      return [];
    }

    const result1 = await response1.json();
    const lastChanged = result1.data?.lastChangeStatuses || [];
    
    if (lastChanged.length === 0) {
      return [];
    }

    const productOrderIds = lastChanged.map((item: any) => item.productOrderId).filter(Boolean);

    // 2) product-orders/query로 상세 정보 조회
    const response2 = await fetch(`${BASE_URL}/pay-order/seller/product-orders/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productOrderIds,
      }),
    });

    if (!response2.ok) {
      const errorText = await response2.text();
      console.error(`주문 상세 조회 실패 (${response2.status}):`, errorText);
      return [];
    }

    const result2 = await response2.json();
    const orders = result2.data || [];

    // 대상 상품 ID + 결제 완료 필터링
    const paidStatuses = ['PAYED', 'PAYMENT_DONE', 'DELIVER_READY', 'DELIVERING', 'DELIVERED'];
    
    return orders
      .filter((order: any) => 
        String(order.productId) === TARGET_PRODUCT_ID &&
        paidStatuses.includes(order.productOrderStatus)
      )
      .map((order: any) => ({
        productOrderId: order.productOrderId,
        productId: order.productId,
        productName: order.productName,
        ordererName: order.ordererName,
        orderDate: order.orderDate,
        status: order.productOrderStatus,
      }));
  } catch (error) {
    console.error('최근 주문 검색 중 오류:', error);
    throw error;
  }
}
