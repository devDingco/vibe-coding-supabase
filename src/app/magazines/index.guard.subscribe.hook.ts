/**
 * 구독 권한 가드 Hook
 * 구독 여부를 검사하고 비구독 시 알림을 띄우는 기능 제공
 */

"use client"

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 결제 레코드 타입
interface PaymentRecord {
  transaction_key: string;
  status: string;
  start_at: string;
  end_grace_at: string;
  created_at: string;
  user_id: string;
}

interface UseSubscribeGuardReturn {
  /**
   * 구독 여부를 검사하는 가드 함수
   * @returns {Promise<boolean>} 구독 여부 (true: 구독중, false: 비구독)
   */
  checkSubscriptionRequired: () => Promise<boolean>;
}

export const useSubscribeGuard = (): UseSubscribeGuardReturn => {
  /**
   * 구독 액션 가드
   * 구독 여부를 검사하고 비구독 시 알림을 띄움
   */
  const checkSubscriptionRequired = useCallback(async (): Promise<boolean> => {
    try {
      // Step 1: 로그인된 사용자 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        alert('로그인이 필요합니다.');
        return false;
      }

      // Step 2: payment 테이블에서 내 결제 정보만 조회
      const { data: allPayments, error: fetchError } = await supabase
        .from('payment')
        .select('transaction_key, status, start_at, end_grace_at, created_at, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('결제 정보 조회 오류:', fetchError);
        alert('구독 후 이용 가능합니다.');
        return false;
      }

      // 조회 결과가 없는 경우
      if (!allPayments || allPayments.length === 0) {
        alert('구독 후 이용 가능합니다.');
        return false;
      }

      // Step 3: transaction_key로 그룹화하고 각 그룹에서 created_at 최신 1건씩 추출
      const groupedByTransactionKey = new Map<string, PaymentRecord>();
      
      allPayments.forEach((payment) => {
        const existingPayment = groupedByTransactionKey.get(payment.transaction_key);
        
        // 해당 transaction_key의 첫 번째 레코드이거나, 더 최신 레코드인 경우
        if (!existingPayment || 
            new Date(payment.created_at) > new Date(existingPayment.created_at)) {
          groupedByTransactionKey.set(payment.transaction_key, payment);
        }
      });

      const latestPayments = Array.from(groupedByTransactionKey.values());

      // Step 4: status === "Paid"이고 start_at <= 현재시각 <= end_grace_at 조건 필터링
      const now = new Date();
      
      const activeSubscriptions = latestPayments.filter(payment => {
        const startAt = new Date(payment.start_at);
        const endGraceAt = new Date(payment.end_grace_at);
        
        return (
          payment.status === "Paid" &&
          startAt <= now &&
          now <= endGraceAt
        );
      });

      // Step 5: 조회 결과 1건 이상이면 구독중, 아니면 비구독
      if (activeSubscriptions.length > 0) {
        // 구독중
        return true;
      } else {
        // 비구독
        alert('구독 후 이용 가능합니다.');
        return false;
      }

    } catch (error) {
      console.error("구독 상태 확인 중 오류:", error);
      alert('구독 후 이용 가능합니다.');
      return false;
    }
  }, []);

  return {
    checkSubscriptionRequired,
  };
};

