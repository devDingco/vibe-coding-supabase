import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments
 * PortOne V2를 사용한 빌링키 결제 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { billingKey, orderName, amount, customer } = body;

    // 2. 필수 값 검증
    if (!billingKey || !orderName || !amount || !customer?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '필수 파라미터가 누락되었습니다.' 
        },
        { status: 400 }
      );
    }

    // 3. PortOne API Secret 확인
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

    // 4. 고유한 paymentId 생성 (timestamp + random)
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // 5. PortOne API 엔드포인트 및 요청 바디 구성
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
      currency: 'KRW'
    };

    // 6. PortOne API 호출
    const portoneResponse = await fetch(portoneUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${portoneApiSecret}`
      },
      body: JSON.stringify(portoneRequestBody)
    });

    // 7. PortOne 응답 처리
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

    // 8. 성공 응답 반환
    return NextResponse.json({
      success: true,
      paymentId,
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

