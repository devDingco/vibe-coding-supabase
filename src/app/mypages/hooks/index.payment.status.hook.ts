"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// 결제 상태 타입 정의
interface PaymentRecord {
  transaction_key: string;
  status: string;
  start_at: string;
  end_grace_at: string;
  created_at: string;
}

// 구독 상태 정의
export interface SubscriptionStatus {
  isSubscribed: boolean;
  statusMessage: "구독중" | "Free";
  transactionKey?: string;
  showCancelButton: boolean;
  showSubscribeButton: boolean;
}

export function usePaymentStatus() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    statusMessage: "Free",
    showCancelButton: false,
    showSubscribeButton: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, string>>({});

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: payment 테이블에서 모든 데이터 조회
      setChecklist(prev => ({
        ...prev,
        "Step 1": "✅ payment 테이블 조회 시작"
      }));

      const { data: allPayments, error: fetchError } = await supabase
        .from('payment')
        .select('transaction_key, status, start_at, end_grace_at, created_at')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setChecklist(prev => ({
        ...prev,
        "Step 1-1": `✅ payment 테이블 조회 완료 (총 ${allPayments?.length || 0}건)`
      }));

      if (!allPayments || allPayments.length === 0) {
        setChecklist(prev => ({
          ...prev,
          "Step 1-2": "✅ 조회 결과 0건 - Free 상태로 설정"
        }));

        setSubscriptionStatus({
          isSubscribed: false,
          statusMessage: "Free",
          showCancelButton: false,
          showSubscribeButton: true,
        });
        return;
      }

      // Step 2: transaction_key로 그룹화하고 각 그룹에서 created_at 최신 1건씩 추출
      setChecklist(prev => ({
        ...prev,
        "Step 2": "✅ transaction_key로 그룹화 시작"
      }));

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
      
      setChecklist(prev => ({
        ...prev,
        "Step 2-1": `✅ 그룹화 완료 (${latestPayments.length}개 그룹, 각 그룹별 최신 1건 추출)`
      }));

      // Step 3: status === "Paid"이고 start_at <= 현재시각 <= end_grace_at 조건 필터링
      setChecklist(prev => ({
        ...prev,
        "Step 3": "✅ 필터링 조건 적용 시작"
      }));

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

      setChecklist(prev => ({
        ...prev,
        "Step 3-1": `✅ 필터링 완료 (조건 충족: ${activeSubscriptions.length}건)`
      }));

      // Step 4: 조회 결과에 따른 상태 설정
      if (activeSubscriptions.length > 0) {
        // 1건 이상 - 구독중
        const activePayment = activeSubscriptions[0];
        
        setChecklist(prev => ({
          ...prev,
          "Step 4": "✅ 조회 결과 1건 이상 - 구독중 상태로 설정",
          "Step 4-1": `✅ transaction_key: ${activePayment.transaction_key}`,
          "Step 4-2": "✅ '구독취소' 버튼 활성화"
        }));

        setSubscriptionStatus({
          isSubscribed: true,
          statusMessage: "구독중",
          transactionKey: activePayment.transaction_key,
          showCancelButton: true,
          showSubscribeButton: false,
        });
      } else {
        // 0건 - Free
        setChecklist(prev => ({
          ...prev,
          "Step 4": "✅ 조회 결과 0건 - Free 상태로 설정",
          "Step 4-1": "✅ '구독하기' 버튼 활성화"
        }));

        setSubscriptionStatus({
          isSubscribed: false,
          statusMessage: "Free",
          showCancelButton: false,
          showSubscribeButton: true,
        });
      }

      setChecklist(prev => ({
        ...prev,
        "완료": "✅ 모든 단계 완료"
      }));

    } catch (error) {
      console.error("구독 상태 확인 중 오류:", error);
      
      setChecklist(prev => ({
        ...prev,
        "Error": `❌ 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      }));

      // 오류 발생 시 기본값으로 Free 상태 설정
      setSubscriptionStatus({
        isSubscribed: false,
        statusMessage: "Free",
        showCancelButton: false,
        showSubscribeButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    checklist,
    refetch: checkSubscriptionStatus
  };
}

