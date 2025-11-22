"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CancelPaymentResponse {
  success: boolean;
  error?: string;
  checklist?: Record<string, string>;
  data?: {
    transactionKey: string;
    cancelResponse: Record<string, unknown>;
  };
}

export function usePaymentCancel() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const cancelPayment = async (transactionKey: string) => {
    try {
      setIsLoading(true);

      // Step 1: 구독 취소 API 요청
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionKey
        })
      });

      const data: CancelPaymentResponse = await response.json();

      // Step 2: 응답 처리
      if (data.success) {
        // Step 3: 알림 메시지 표시
        alert("구독이 취소되었습니다.");
        
        // Step 4: 페이지 이동
        router.push("/magazines");
        
        return { success: true };
      } else {
        // 에러 처리
        alert(data.error || "구독 취소에 실패했습니다.");
        return { success: false, error: data.error };
      }

    } catch (error) {
      console.error("구독 취소 중 오류:", error);
      alert("구독 취소 중 오류가 발생했습니다.");
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelPayment,
    isLoading
  };
}

