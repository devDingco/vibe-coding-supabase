import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/payments
 * PortOne V2를 사용한 빌링키 결제 API
 * 
 * 요구사항:
 * - 인증 토큰 검증 (Authorization 헤더)
 * - 결제 가능 여부 검증 (인가된 user_id === customData)
 * - customData에 로그인된 user_id 전달
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: 인증 토큰 검증 (가장 간단한 인가 방식)
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

    // Step 2: 요청 데이터 파싱
    const body = await request.json();
    const { billingKey, orderName, amount, customer, customData } = body;

    // Step 3: 필수 값 검증
    if (!billingKey || !orderName || !amount || !customer?.id || !customData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '필수 파라미터가 누락되었습니다.' 
        },
        { status: 400 }
      );
    }

    // Step 4: 결제 가능 여부 검증 - 인가된 user_id === customData
    if (userId !== customData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '결제 권한이 없습니다. 인증된 사용자와 요청 사용자가 일치하지 않습니다.',
          details: {
            authenticatedUserId: userId,
            requestedCustomData: customData
          }
        },
        { status: 403 }
      );
    }

    // Step 5: PortOne API Secret 확인
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

    // Step 6: 고유한 paymentId 생성 (timestamp + random)
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Step 7: PortOne API 엔드포인트 및 요청 바디 구성
    const portoneUrl = `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`;
    const portoneRequestBody = {
      billingKey,
      orderName,
      amount: {
        total: amount
      },
      customer: {
        id: customer.id
      },
      customData: customData, // 로그인된 user_id
      currency: 'KRW'
    };

    // Step 8: PortOne API 호출
    const portoneResponse = await fetch(portoneUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${portoneApiSecret}`
      },
      body: JSON.stringify(portoneRequestBody)
    });

    // Step 9: PortOne 응답 처리
    const portoneData = await portoneResponse.json();

    if (!portoneResponse.ok) {
      console.error('PortOne API 에러:', portoneData);
      return NextResponse.json(
        { 
          success: false, 
          error: portoneData.message || 'PortOne 결제 요청 실패',
          details: portoneData
        },
        { status: portoneResponse.status }
      );
    }

    // Step 10: 성공 응답 반환 (DB에 저장하지 않고 응답 반환)
    return NextResponse.json({
      success: true,
      paymentId,
      userId,
      portoneResponse: portoneData
    });

  } catch (error) {
    console.error('결제 API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '결제 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}




