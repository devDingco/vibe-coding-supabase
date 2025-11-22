import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments/cancel
 * PortOne V2를 사용한 결제 취소 API
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

    // Step 3: PortOne API Secret 확인
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

    // Step 4: PortOne 결제 취소 API 호출
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

    // Step 5: PortOne 응답 처리
    const portoneData = await portoneResponse.json();

    if (!portoneResponse.ok) {
      console.error('PortOne 결제 취소 에러:', portoneData);
      return NextResponse.json(
        { 
          success: false, 
          error: portoneData.message || 'PortOne 결제 취소 요청 실패',
          details: portoneData,
          checklist: {
            '1. 요청 데이터 검증': '✅ 완료',
            '2. PortOne API Secret 확인': '✅ 완료',
            '3. PortOne 결제 취소 요청': '❌ 실패'
          }
        },
        { status: portoneResponse.status }
      );
    }

    // Step 6: 성공 응답 반환 (DB 저장하지 않음)
    return NextResponse.json({
      success: true,
      checklist: {
        '1. 요청 데이터 검증': '✅ 완료',
        '2. PortOne API Secret 확인': '✅ 완료',
        '3. PortOne 결제 취소 요청': '✅ 완료',
        '4. DB 저장': '⚠️ 스킵 (요구사항에 따라 DB 저장 없음)'
      },
      data: {
        transactionKey,
        cancelResponse: portoneData
      }
    });

  } catch (error) {
    console.error('결제 취소 API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '결제 취소 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        checklist: {
          '1. 요청 데이터 검증': '✅ 완료',
          '2. PortOne API Secret 확인': '✅ 완료',
          '3. PortOne 결제 취소 요청': '❌ 예외 발생'
        }
      },
      { status: 500 }
    );
  }
}

