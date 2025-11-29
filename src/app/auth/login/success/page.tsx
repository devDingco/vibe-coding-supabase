'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginSuccessPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('세션 확인 중 오류:', error);
          // 오류 발생시 로그인 페이지로 리다이렉트
          router.push('/auth/login');
          return;
        }

        if (session) {
          console.log('로그인 성공, 사용자:', session.user);
          // 세션이 확인되면 메인 페이지로 이동
          router.push('/magazines');
        } else {
          // 세션이 없으면 로그인 페이지로 리다이렉트
          console.log('세션 없음, 로그인 페이지로 이동');
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('예상치 못한 오류:', error);
        router.push('/auth/login');
      } finally {
        setIsChecking(false);
      }
    };

    // 약간의 지연을 주어 세션이 완전히 설정될 시간을 줌
    const timer = setTimeout(() => {
      checkSession();
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  // 로딩 화면
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            로그인 처리 중...
          </h2>
          <p className="text-gray-600">
            잠시만 기다려주세요
          </p>
        </div>
      </div>
    );
  }

  return null;
}

