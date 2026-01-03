import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { db, storage } from '../firebase';
import { collection, getDocs, doc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import type { InvitationData } from '../types';

interface InvitationListItem extends InvitationData {
  id: string;
}

interface ApprovedOrder {
  id: string;
  productOrderId: string;
  approvedAt: number;
  used: boolean;
  usedAt?: number;
  invitationId?: string;
}

export default function AdminPage() {
  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [orders, setOrders] = useState<ApprovedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'invitations' | 'orders'>('invitations');

  const ADMIN_PASSWORD = '1q2w3e!@';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadInvitations();
      loadOrders();
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'invitations'));
      const invitationsList: InvitationListItem[] = [];
      
      querySnapshot.forEach((doc) => {
        invitationsList.push({
          id: doc.id,
          ...(doc.data() as InvitationData)
        });
      });

      invitationsList.sort((a, b) => {
        const aTime = a.createdAt || 0;
        const bTime = b.createdAt || 0;
        return bTime - aTime;
      });

      setInvitations(invitationsList);
    } catch (error) {
      console.error('초대장 목록 로드 실패:', error);
      alert('초대장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const q = query(collection(db, 'approvedOrders'), orderBy('approvedAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersList: ApprovedOrder[] = [];
      snapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() } as ApprovedOrder);
      });
      setOrders(ordersList);
    } catch (error) {
      console.error('주문 목록 로드 실패:', error);
    }
  };

  const handleAddOrder = async () => {
    if (!orderIdInput.trim()) {
      alert('주문번호를 입력해주세요.');
      return;
    }

    setOrderLoading(true);
    try {
      const existingOrder = orders.find(o => o.productOrderId === orderIdInput.trim());
      if (existingOrder) {
        alert('이미 등록된 주문번호입니다.');
        return;
      }

      await addDoc(collection(db, 'approvedOrders'), {
        productOrderId: orderIdInput.trim(),
        approvedAt: Date.now(),
        approvedBy: 'admin',
        used: false,
      });

      alert('주문번호가 등록되었습니다.');
      setOrderIdInput('');
      await loadOrders();
    } catch (error) {
      console.error('주문 등록 실패:', error);
      alert('주문 등록 중 오류가 발생했습니다.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, productOrderId: string) => {
    if (!window.confirm(`주문번호 ${productOrderId}를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'approvedOrders', orderId));
      alert('삭제되었습니다.');
      await loadOrders();
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (invitationId: string) => {
    if (!confirm('정말로 이 초대장을 삭제하시겠습니까?\n\n모든 이미지와 데이터가 영구적으로 삭제됩니다.')) {
      return;
    }

    try {
      setDeleting(invitationId);

      const storageRef = ref(storage, `invitations/${invitationId}`);
      const listResult = await listAll(storageRef);
      
      await Promise.all(
        listResult.items.map(itemRef => deleteObject(itemRef))
      );

      await deleteDoc(doc(db, 'invitations', invitationId));

      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      alert('초대장이 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('초대장 삭제 실패:', error);
      alert('초대장 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '무제한';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date < now) {
      return <span className="text-red-600 font-bold">만료됨</span>;
    }
    
    return (
      <span className="text-green-600">
        {date.getFullYear()}.{String(date.getMonth() + 1).padStart(2, '0')}.{String(date.getDate()).padStart(2, '0')} {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')}
      </span>
    );
  };

  const getRemainingDays = (timestamp?: number) => {
    if (!timestamp) return null;
    
    const now = new Date();
    const expiryDate = new Date(timestamp);
    const diff = expiryDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return <span className="text-red-600">만료</span>;
    if (days === 0) return <span className="text-orange-600">오늘</span>;
    if (days === 1) return <span className="text-orange-600">내일</span>;
    
    return <span className="text-blue-600">{days}일 남음</span>;
  };

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>관리자 로그인 | 초대장 관리</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
              🔐 관리자 로그인
            </h1>
            <form onSubmit={handleLogin}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-pink-400 focus:outline-none mb-4"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white py-3 rounded-lg font-bold hover:from-pink-500 hover:to-purple-500 transition-all"
              >
                로그인
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>청첩장 관리 대시보드 | 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                📊 청첩장 관리자
              </h1>
              <button
                onClick={() => {
                  loadInvitations();
                  loadOrders();
                }}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                🔄 새로고침
              </button>
            </div>
            
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('invitations')}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === 'invitations'
                    ? 'border-b-2 border-pink-500 text-pink-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 청첩장 목록 ({invitations.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-3 font-semibold transition-all ${
                  activeTab === 'orders'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🛒 주문번호 관리 ({orders.length})
              </button>
            </div>
          </div>

          {activeTab === 'orders' ? (
            <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">주문번호 등록</h2>
              
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => setOrderIdInput(e.target.value)}
                  placeholder="주문번호 입력 (예: 2024010112345678)"
                  className="flex-1 rounded-lg border border-gray-300 p-3 text-gray-900"
                  disabled={orderLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddOrder();
                    }
                  }}
                />
                <button
                  onClick={handleAddOrder}
                  disabled={orderLoading}
                  className="rounded-lg px-6 py-3 font-bold text-white disabled:bg-gray-300 bg-blue-500 hover:bg-blue-600"
                >
                  {orderLoading ? '등록 중...' : '등록'}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>고객이 네이버 톡톡으로 주문번호를 알려주면</li>
                  <li>위 입력창에 주문번호를 입력하고 "등록" 버튼 클릭</li>
                  <li>고객이 웹사이트에서 해당 주문번호로 청첩장 생성 가능</li>
                  <li>청첩장 생성 시 자동으로 "사용됨" 상태로 변경 (중복 방지)</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 mb-2">
                  등록된 주문번호 ({orders.length}개)
                </h3>
                
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-sm">등록된 주문번호가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          order.used ? 'bg-gray-50 border-gray-300' : 'bg-green-50 border-green-300'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-mono font-semibold text-gray-900">
                            {order.productOrderId}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            등록: {new Date(order.approvedAt).toLocaleString('ko-KR')}
                          </p>
                          {order.used && (
                            <p className="text-xs text-red-600 mt-1">
                              ✓ 사용됨 ({order.invitationId}) - {order.usedAt ? new Date(order.usedAt).toLocaleString('ko-KR') : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {order.used ? (
                            <span className="px-3 py-1 rounded bg-gray-300 text-gray-700 text-sm">
                              사용 완료
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded bg-green-600 text-white text-sm">
                              사용 가능
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id, order.productOrderId)}
                            className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="text-gray-600 text-sm">
                  총 <span className="font-bold text-pink-600 text-lg">{invitations.length}</span>개의 청첩장
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-400 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">로딩 중...</p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
                  <p className="text-gray-500 text-lg">등록된 청첩장이 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-bold text-gray-800">
                              {invitation.groomName} ❤️ {invitation.brideName}
                            </h3>
                            {getRemainingDays(invitation.expiresAt) && (
                              <span className="px-3 py-1 bg-blue-50 rounded-full text-sm font-semibold">
                                {getRemainingDays(invitation.expiresAt)}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">📅 결혼식:</span>
                              <span>{invitation.weddingDate} {invitation.weddingTime}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">📍 장소:</span>
                              <span>{invitation.weddingLocation} {invitation.weddingHall}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">🔗 URL:</span>
                              <a
                                href={`/invitation/${invitation.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 hover:underline break-all"
                              >
                                /invitation/{invitation.id}
                              </a>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">⏰ 만료:</span>
                              {formatDate(invitation.expiresAt)}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-700">📸 사진:</span>
                              <span>{invitation.imageUrls?.length || 0}장</span>
                            </div>
                            
                            {invitation.createdAt && (
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">📅 생성:</span>
                                <span className="text-gray-500">
                                  {new Date(invitation.createdAt).toLocaleString('ko-KR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex md:flex-col gap-2">
                          <a
                            href={`/invitation/${invitation.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-center whitespace-nowrap"
                          >
                            👀 미리보기
                          </a>
                          
                          <button
                            onClick={() => handleDelete(invitation.id)}
                            disabled={deleting === invitation.id}
                            className={`px-6 py-2 rounded-lg transition-all text-center whitespace-nowrap ${
                              deleting === invitation.id
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                          >
                            {deleting === invitation.id ? '삭제 중...' : '🗑️ 삭제'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
