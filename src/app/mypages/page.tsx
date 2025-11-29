"use client"

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePaymentCancel } from "./hooks/index.payment.cancel.hook";
import { usePaymentStatus } from "./hooks/index.payment.status.hook";
import { useProfile } from "./hooks/index.profile.hook";

function GlossaryMagazinesMypage() {
  const router = useRouter();
  const { profile, isLoading: profileLoading, checklist: profileChecklist } = useProfile();
  const { cancelPayment, isLoading: cancelLoading } = usePaymentCancel();
  const { subscriptionStatus, isLoading: statusLoading, checklist, refetch } = usePaymentStatus();

  // 체크리스트를 콘솔에 출력 (개발 중 확인용)
  useEffect(() => {
    if (Object.keys(checklist).length > 0) {
      console.log("=== 구독 상태 확인 체크리스트 ===");
      Object.entries(checklist).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }
  }, [checklist]);

  // 프로필 체크리스트를 콘솔에 출력 (개발 중 확인용)
  useEffect(() => {
    if (Object.keys(profileChecklist).length > 0) {
      console.log("=== 프로필 조회 체크리스트 ===");
      Object.entries(profileChecklist).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }
  }, [profileChecklist]);

  const handleBackToList = () => {
    router.push('/magazines');
  };

  const handleSubscribe = () => {
    // 결제 페이지로 이동
    router.push('/payments');
  };

  const handleCancelSubscription = async () => {
    if (confirm("구독을 취소하시겠습니까?")) {
      // transactionKey가 있는 경우에만 API 호출
      if (subscriptionStatus.transactionKey) {
        await cancelPayment(subscriptionStatus.transactionKey);
        // 구독 취소 후 상태 다시 조회
        refetch();
      } else {
        alert("구독 정보를 찾을 수 없습니다.");
      }
    }
  };

  const isSubscribed = subscriptionStatus.isSubscribed;
  const isLoading = statusLoading || cancelLoading;

  // 프로필이 로딩 중일 때 표시
  if (profileLoading) {
    return (
      <div className="mypage-wrapper">
        <div className="mypage-header">
          <h1>프로필 로딩 중...</h1>
        </div>
      </div>
    );
  }

  // 프로필이 없을 때 (로그인하지 않은 경우)
  if (!profile) {
    return (
      <div className="mypage-wrapper">
        <div className="mypage-header">
          <h1>로그인이 필요합니다</h1>
          <button onClick={() => router.push('/auth/login')}>로그인하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mypage-wrapper">
      <button className="mypage-back-btn" onClick={handleBackToList}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 15L7.5 10L12.5 5" />
        </svg>
        목록으로
      </button>

      <div className="mypage-header">
        <h1>IT 매거진 구독</h1>
        <p className="mypage-header-desc">프리미엄 콘텐츠를 제한 없이 이용하세요</p>
      </div>

      <div className="mypage-grid">
        {/* 프로필 카드 */}
        <div className="mypage-profile-card">
          {profile.profileImage ? (
            <img 
              src={profile.profileImage} 
              alt={profile.nickname}
              className="mypage-avatar"
            />
          ) : (
            <div className="mypage-avatar-fallback">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="24" cy="24" r="20" />
                <circle cx="24" cy="20" r="8" />
                <path d="M8 40C8 32 15 28 24 28C33 28 40 32 40 40" />
              </svg>
            </div>
          )}
          <h2 className="mypage-name">{profile.nickname}</h2>
          <p className="mypage-bio-text">{profile.bio}</p>
          <div className="mypage-join-date">가입일 {profile.joinDate}</div>
        </div>

        {/* 구독 플랜 카드 */}
        <div className={`mypage-subscription-card ${isSubscribed ? 'active' : ''}`}>
          <div className="mypage-subscription-header">
            <h3 className="mypage-card-title">구독 플랜</h3>
            {statusLoading ? (
              <span className="mypage-badge-active">확인 중...</span>
            ) : (
              isSubscribed && (
                <span className="mypage-badge-active">{subscriptionStatus.statusMessage}</span>
              )
            )}
          </div>

          {isSubscribed ? (
            <div className="mypage-subscription-active">
              <div className="mypage-plan-name">IT Magazine Premium</div>
              <div className="mypage-plan-features">
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>모든 프리미엄 콘텐츠 무제한 이용</span>
                </div>
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>매주 새로운 IT 트렌드 리포트</span>
                </div>
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>광고 없는 깔끔한 읽기 환경</span>
                </div>
              </div>
              {subscriptionStatus.showCancelButton && (
                <button 
                  className="mypage-cancel-btn"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? "처리 중..." : "구독 취소"}
                </button>
              )}
            </div>
          ) : (
            <div className="mypage-subscription-inactive">
              <div className="mypage-unsubscribed-message">
                {statusLoading ? "구독 상태 확인 중..." : "구독하고 프리미엄 콘텐츠를 즐겨보세요"}
              </div>
              <div className="mypage-plan-preview">
                <div className="mypage-preview-item">✓ 모든 프리미엄 콘텐츠</div>
                <div className="mypage-preview-item">✓ 매주 트렌드 리포트</div>
                <div className="mypage-preview-item">✓ 광고 없는 환경</div>
              </div>
              {subscriptionStatus.showSubscribeButton && (
                <button 
                  className="mypage-subscribe-btn"
                  onClick={handleSubscribe}
                  disabled={statusLoading}
                >
                  지금 구독하기
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlossaryMagazinesMypage;
