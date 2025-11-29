import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/payments/cancel
 * PortOne V2를 사용한 결제 취소 API
 * 
 * 요구사항:
 * - 인증 토큰 검증 (Authorization 헤더)
 * - 결제 취소 가능 여부 검증 (payment 테이블 조회)
 * - PortOne API를 통한 결제 취소
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: 요청 데이터 파싱
    const body = await request.json();
    const { transactionKey } = body;

    // Step 2: 필수 값 검증
    if (!transactionKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'transactionKey가 누락되었습니다.' 
        },
        { status: 400 }
      );
    }

    // Step 3: 인증 토큰 검증 (가장 간단한 인가 방식)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: '인증 토큰이 누락되었습니다.' 
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Supabase를 사용하여 토큰 검증 및 사용자 정보 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: '유효하지 않은 인증 토큰입니다.',
          details: authError?.message
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Step 4: 취소 가능 여부 검증 - payment 테이블 조회
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment')
      .select('*')
      .eq('user_id', userId)
      .eq('transaction_key', transactionKey)
      .single();

    if (paymentError || !paymentData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '취소할 수 있는 결제 정보를 찾을 수 없습니다.',
          details: '해당 사용자의 결제 내역이 존재하지 않거나 권한이 없습니다.',
          checklist: {
            '1. 인증 토큰 검증': '✅ 완료',
            '2. 결제 정보 조회': '❌ 실패 - 결제 내역 없음'
          }
        },
        { status: 404 }
      );
    }

    // Step 5: PortOne API Secret 확인
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PortOne API Secret이 설정되지 않았습니다.',
          checklist: {
            '1. 인증 토큰 검증': '✅ 완료',
            '2. 결제 정보 조회': '✅ 완료',
            '3. PortOne API Secret 확인': '❌ 실패'
          }
        },
        { status: 500 }
      );
    }

    // Step 6: PortOne 결제 취소 API 호출
    const portoneUrl = `https://api.portone.io/payments/${encodeURIComponent(transactionKey)}/cancel`;
    const portoneRequestBody = {
      reason: "취소 사유 없음"
    };

    const portoneResponse = await fetch(portoneUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${portoneApiSecret}`
      },
      body: JSON.stringify(portoneRequestBody)
    });

    // Step 7: PortOne 응답 처리
    const portoneData = await portoneResponse.json();

    if (!portoneResponse.ok) {
      console.error('PortOne 결제 취소 에러:', portoneData);
      return NextResponse.json(
        { 
          success: false, 
          error: portoneData.message || 'PortOne 결제 취소 요청 실패',
          details: portoneData,
          checklist: {
            '1. 인증 토큰 검증': '✅ 완료',
            '2. 결제 정보 조회': '✅ 완료',
            '3. PortOne API Secret 확인': '✅ 완료',
            '4. PortOne 결제 취소 요청': '❌ 실패'
          }
        },
        { status: portoneResponse.status }
      );
    }

    // Step 8: 성공 응답 반환 (DB 저장하지 않음)
    return NextResponse.json({
      success: true,
      checklist: {
        '1. 인증 토큰 검증': '✅ 완료',
        '2. 결제 정보 조회': '✅ 완료',
        '3. 취소 가능 여부 확인': '✅ 완료',
        '4. PortOne API Secret 확인': '✅ 완료',
        '5. PortOne 결제 취소 요청': '✅ 완료',
        '6. DB 저장': '⚠️ 스킵 (요구사항에 따라 DB 저장 없음)'
      },
      data: {
        transactionKey,
        userId,
        paymentInfo: paymentData,
        cancelResponse: portoneData
      }
    });

  } catch (error) {
    console.error('결제 취소 API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '결제 취소 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

