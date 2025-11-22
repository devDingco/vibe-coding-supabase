import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import axios from 'axios';

/**
 * POST /api/portone
 * PortOne V2 구독 결제 웹훅 처리 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { payment_id, status } = body;

    // 2. 필수 값 검증
    if (!payment_id || !status) {
      return NextResponse.json(
        { 
          success: false, 
          error: '필수 파라미터가 누락되었습니다.' 
        },
        { status: 400 }
      );
    }

    // 3. status 값 검증
    if (status !== 'Paid' && status !== 'Cancelled') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'status는 "Paid" 또는 "Cancelled"만 허용됩니다.' 
        },
        { status: 400 }
      );
    }

    // 4. PortOne API Secret 확인
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PortOne API Secret이 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // 5. Paid 시나리오 처리
    if (status === 'Paid') {
      // 5-1. 포트원 API로 결제 정보 조회
      const portoneUrl = `https://api.portone.io/payments/${encodeURIComponent(payment_id)}`;
      const portoneResponse = await fetch(portoneUrl, {
        method: 'GET',
        headers: {
          'Authorization': `PortOne ${portoneApiSecret}`
        }
      });

      if (!portoneResponse.ok) {
        const errorData = await portoneResponse.json();
        console.error('PortOne 결제 정보 조회 실패:', errorData);
        return NextResponse.json(
          { 
            success: false, 
            error: '결제 정보 조회에 실패했습니다.',
            details: errorData
          },
          { status: portoneResponse.status }
        );
      }

      const paymentInfo = await portoneResponse.json();

      // 5-2. 구독 기간 계산 (한국 시간 기준)
      const now = new Date();
      const startAt = now.toISOString();
      
      // 현재시각 + 30일
      const endAt = new Date(now);
      endAt.setDate(endAt.getDate() + 30);
      
      // end_at + 1일 밤 11:59:59 (한국시간 기준) => UTC로 변환하여 저장
      // 한국시간(KST) = UTC + 9시간
      // 한국시간 23:59:59 = UTC 14:59:59
      const endGraceAt = new Date(endAt);
      endGraceAt.setDate(endGraceAt.getDate() + 1);
      endGraceAt.setUTCHours(14, 59, 59, 999); // 한국시간 23:59:59를 UTC로 변환
      
      // end_at + 1일 오전 10시~11시 사이 임의 시각 (한국시간 기준) => UTC로 변환하여 저장
      // 한국시간 10시~11시 = UTC 1시~2시
      const nextScheduleAt = new Date(endAt);
      nextScheduleAt.setDate(nextScheduleAt.getDate() + 1);
      const randomMinutes = Math.floor(Math.random() * 60); // 0~59분
      nextScheduleAt.setUTCHours(1, randomMinutes, 0, 0); // 한국시간 10시~11시를 UTC로 변환
      
      // 5-3. 고유한 next_schedule_id 생성
      const nextScheduleId = randomUUID();

      // 5-4. Supabase payment 테이블에 데이터 저장
      const { error: insertError } = await supabase
        .from('payment')
        .insert({
          transaction_key: paymentInfo.id || payment_id,
          amount: paymentInfo.amount?.total || 0,
          status: 'Paid',
          start_at: startAt,
          end_at: endAt.toISOString(),
          end_grace_at: endGraceAt.toISOString(),
          next_schedule_at: nextScheduleAt.toISOString(),
          next_schedule_id: nextScheduleId
        });

      if (insertError) {
        console.error('Supabase 저장 실패:', insertError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'DB 저장에 실패했습니다.',
            details: insertError.message
          },
          { status: 500 }
        );
      }

      // 5-5. 다음달 구독 결제 예약
      const scheduleUrl = `https://api.portone.io/payments/${encodeURIComponent(nextScheduleId)}/schedule`;
      const scheduleRequestBody = {
        payment: {
          billingKey: paymentInfo.billingKey,
          orderName: paymentInfo.orderName,
          customer: {
            id: paymentInfo.customer?.id
          },
          amount: {
            total: paymentInfo.amount?.total || 0
          },
          currency: 'KRW'
        },
        timeToPay: nextScheduleAt.toISOString()
      };

      const scheduleResponse = await fetch(scheduleUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${portoneApiSecret}`
        },
        body: JSON.stringify(scheduleRequestBody)
      });

      if (!scheduleResponse.ok) {
        const scheduleError = await scheduleResponse.json();
        console.error('포트원 구독 예약 실패:', scheduleError);
        // 예약 실패해도 결제 정보는 저장되었으므로 경고만 반환
        return NextResponse.json({
          success: true,
          warning: '구독 예약에 실패했습니다.',
          scheduleError: scheduleError,
          checklist: {
            '1. 결제 정보 조회': '✅ 완료',
            '2. DB 저장': '✅ 완료',
            '3. 구독 예약': '❌ 실패'
          }
        });
      }

      const scheduleData = await scheduleResponse.json();

      // 6. 성공 응답 반환 (체크리스트 포함)
      return NextResponse.json({
        success: true,
        checklist: {
          '1. 결제 정보 조회': '✅ 완료',
          '2. DB 저장': '✅ 완료',
          '3. 구독 예약': '✅ 완료'
        },
        data: {
          paymentInfo: {
            transaction_key: paymentInfo.id || payment_id,
            amount: paymentInfo.amount?.total || 0,
            status: 'Paid'
          },
          subscription: {
            start_at: startAt,
            end_at: endAt.toISOString(),
            end_grace_at: endGraceAt.toISOString(),
            next_schedule_at: nextScheduleAt.toISOString(),
            next_schedule_id: nextScheduleId
          },
          scheduleResponse: scheduleData
        }
      });
    }

    // 7. Cancelled 시나리오 처리
    if (status === 'Cancelled') {
      // 7-1. 구독결제취소시나리오
      // 7-1-1. Supabase에서 기존 결제 정보 조회
      const { data: existingPayment, error: selectError } = await supabase
        .from('payment')
        .select('*')
        .eq('transaction_key', payment_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectError || !existingPayment) {
        console.error('기존 결제 정보 조회 실패:', selectError);
        return NextResponse.json(
          { 
            success: false, 
            error: '기존 결제 정보를 찾을 수 없습니다.',
            details: selectError?.message
          },
          { status: 404 }
        );
      }

      // 7-1-2. 취소 내역을 payment 테이블에 등록
      const { error: cancelInsertError } = await supabase
        .from('payment')
        .insert({
          transaction_key: existingPayment.transaction_key,
          amount: -existingPayment.amount, // 음수로 저장
          status: 'Cancel',
          start_at: existingPayment.start_at,
          end_at: existingPayment.end_at,
          end_grace_at: existingPayment.end_grace_at,
          next_schedule_at: existingPayment.next_schedule_at,
          next_schedule_id: existingPayment.next_schedule_id
        });

      if (cancelInsertError) {
        console.error('취소 내역 저장 실패:', cancelInsertError);
        return NextResponse.json(
          { 
            success: false, 
            error: '취소 내역 저장에 실패했습니다.',
            details: cancelInsertError.message
          },
          { status: 500 }
        );
      }

      // 7-2. 다음달구독예약취소시나리오
      // 7-2-1. 포트원 API로 결제 정보 조회
      const portoneUrl = `https://api.portone.io/payments/${encodeURIComponent(payment_id)}`;
      const portoneResponse = await fetch(portoneUrl, {
        method: 'GET',
        headers: {
          'Authorization': `PortOne ${portoneApiSecret}`
        }
      });

      if (!portoneResponse.ok) {
        const errorData = await portoneResponse.json();
        console.error('PortOne 결제 정보 조회 실패:', errorData);
        // 결제 취소는 완료되었으므로 경고만 반환
        return NextResponse.json({
          success: true,
          warning: '결제 취소는 완료되었으나, 예약 취소에 실패했습니다.',
          error: errorData,
          checklist: {
            '1. 기존 결제 정보 조회': '✅ 완료',
            '2. 취소 내역 DB 저장': '✅ 완료',
            '3. 포트원 결제 정보 조회': '❌ 실패',
            '4. 예약된 결제 조회': '⏭️ 생략',
            '5. 예약 취소 요청': '⏭️ 생략'
          }
        });
      }

      const paymentInfo = await portoneResponse.json();

      // 7-2-2. 예약된 결제정보 조회 (GET 메서드에 body 포함, axios 사용)
      const nextScheduleAt = new Date(existingPayment.next_schedule_at);
      const fromDate = new Date(nextScheduleAt);
      fromDate.setDate(fromDate.getDate() - 1);
      const untilDate = new Date(nextScheduleAt);
      untilDate.setDate(untilDate.getDate() + 1);

      let scheduleListResponse;
      try {
        scheduleListResponse = await axios.get('https://api.portone.io/payment-schedules', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `PortOne ${portoneApiSecret}`
          },
          data: {
            filter: {
              billingKey: paymentInfo.billingKey,
              from: fromDate.toISOString(),
              until: untilDate.toISOString()
            }
          }
        });
      } catch (axiosError: unknown) {
        const errorMessage = axios.isAxiosError(axiosError) 
          ? (axiosError.response?.data || axiosError.message)
          : '알 수 없는 오류';
        console.error('예약된 결제 조회 실패:', errorMessage);
        return NextResponse.json({
          success: true,
          warning: '결제 취소는 완료되었으나, 예약 조회에 실패했습니다.',
          error: errorMessage,
          checklist: {
            '1. 기존 결제 정보 조회': '✅ 완료',
            '2. 취소 내역 DB 저장': '✅ 완료',
            '3. 포트원 결제 정보 조회': '✅ 완료',
            '4. 예약된 결제 조회': '❌ 실패',
            '5. 예약 취소 요청': '⏭️ 생략'
          }
        });
      }

      // 7-2-3. items를 순회하여 next_schedule_id와 일치하는 객체 추출
      const scheduleItems = scheduleListResponse.data?.items || [];
      const targetSchedule = scheduleItems.find(
        (item: { id?: string; paymentId?: string }) => item.paymentId === existingPayment.next_schedule_id
      );

      if (!targetSchedule) {
        console.warn('예약된 결제를 찾을 수 없습니다. 이미 취소되었거나 존재하지 않을 수 있습니다.');
        return NextResponse.json({
          success: true,
          warning: '결제 취소는 완료되었으나, 예약된 결제를 찾을 수 없습니다.',
          checklist: {
            '1. 기존 결제 정보 조회': '✅ 완료',
            '2. 취소 내역 DB 저장': '✅ 완료',
            '3. 포트원 결제 정보 조회': '✅ 완료',
            '4. 예약된 결제 조회': '✅ 완료',
            '5. 예약 취소 요청': '⚠️ 예약된 결제를 찾을 수 없음'
          }
        });
      }

      // 7-2-4. 포트원에 다음달 구독 예약 취소
      const cancelScheduleUrl = 'https://api.portone.io/payment-schedules';
      const cancelScheduleResponse = await fetch(cancelScheduleUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${portoneApiSecret}`
        },
        body: JSON.stringify({
          scheduleIds: [targetSchedule.id]
        })
      });

      if (!cancelScheduleResponse.ok) {
        const cancelError = await cancelScheduleResponse.json();
        console.error('예약 취소 요청 실패:', cancelError);
        return NextResponse.json({
          success: true,
          warning: '결제 취소는 완료되었으나, 예약 취소에 실패했습니다.',
          error: cancelError,
          checklist: {
            '1. 기존 결제 정보 조회': '✅ 완료',
            '2. 취소 내역 DB 저장': '✅ 완료',
            '3. 포트원 결제 정보 조회': '✅ 완료',
            '4. 예약된 결제 조회': '✅ 완료',
            '5. 예약 취소 요청': '❌ 실패'
          }
        });
      }

      const cancelScheduleData = await cancelScheduleResponse.json();

      // 8. 성공 응답 반환 (체크리스트 포함)
      return NextResponse.json({
        success: true,
        checklist: {
          '1. 기존 결제 정보 조회': '✅ 완료',
          '2. 취소 내역 DB 저장': '✅ 완료',
          '3. 포트원 결제 정보 조회': '✅ 완료',
          '4. 예약된 결제 조회': '✅ 완료',
          '5. 예약 취소 요청': '✅ 완료'
        },
        data: {
          cancelledPayment: {
            transaction_key: existingPayment.transaction_key,
            amount: -existingPayment.amount,
            status: 'Cancel'
          },
          cancelledSchedule: cancelScheduleData
        }
      });
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('구독 결제 웹훅 처리 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '웹훅 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

