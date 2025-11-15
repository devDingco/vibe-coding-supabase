import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

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

    // 7. Cancelled 시나리오 (향후 구현 가능)
    if (status === 'Cancelled') {
      // TODO: 구독 취소 로직 구현
      return NextResponse.json({
        success: true,
        message: '취소 처리는 아직 구현되지 않았습니다.',
        checklist: {
          '1. 취소 처리': '⚠️ 미구현'
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

