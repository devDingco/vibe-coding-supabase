'use client';

import { useRouter } from 'next/navigation';
import PortOne from '@portone/browser-sdk/v2';
import { supabase } from '@/lib/supabase';

/**
 * 포트원 V2 빌링키 발급 및 결제 처리 hook
 */
export function usePayment() {
  const router = useRouter();

  /**
   * 구독하기 버튼 클릭 시 실행되는 함수
   * 1. 빌링키 발급
   * 2. 결제 API 호출 (인증토큰 헤더 포함, customData에 user_id 전달)
   * 3. 성공 시 알림 및 페이지 이동
   */
  const handleSubscribe = async () => {
    try {
      // 0. 인증 세션 확인 및 토큰 가져오기
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
        router.push('/login');
        return;
      }

      const accessToken = session.access_token;
      const userId = session.user.id;

      // 1. 빌링키 발급 요청
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        billingKeyMethod: 'CARD',
      });

      // 빌링키 발급 실패 처리
      if (!issueResponse || issueResponse.code !== undefined) {
        alert(`빌링키 발급 실패: ${issueResponse?.message || '알 수 없는 오류'}`);
        return;
      }

      // 2. 발급된 빌링키로 결제 API 호출
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`, // 인증토큰 헤더 추가
        },
        body: JSON.stringify({
          billingKey: issueResponse.billingKey,
          orderName: 'IT 매거진 월간 구독',
          amount: 9900,
          customer: {
            id: `customer_${Date.now()}`,
          },
          customData: userId, // 로그인된 user_id 전달
        }),
      });

      const paymentData = await paymentResponse.json();

      // 결제 실패 처리
      if (!paymentData.success) {
        alert(`결제 실패: ${paymentData.error || '알 수 없는 오류'}`);
        return;
      }

      // 3. 결제 성공
      alert('구독에 성공하였습니다.');
      router.push('/magazines');
    } catch (error) {
      console.error('구독 처리 중 오류:', error);
      alert('구독 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return {
    handleSubscribe,
  };
}

