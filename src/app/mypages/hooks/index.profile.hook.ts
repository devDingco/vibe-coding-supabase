"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// 프로필 데이터 타입 정의
export interface UserProfile {
  profileImage: string;
  nickname: string;
  bio: string;
  joinDate: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Step 1: Supabase Auth에서 현재 사용자 정보 조회
      setChecklist(prev => ({
        ...prev,
        "Step 1": "✅ Supabase Auth 사용자 정보 조회 시작"
      }));

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setChecklist(prev => ({
          ...prev,
          "Step 1-1": "⚠️ 로그인된 사용자 없음"
        }));
        setIsLoading(false);
        return;
      }

      setChecklist(prev => ({
        ...prev,
        "Step 1-1": `✅ 사용자 조회 완료 (ID: ${user.id.substring(0, 8)}...)`,
        "Step 1-2": `✅ 이메일: ${user.email || 'N/A'}`
      }));

      // Step 2: 프로필 데이터 생성
      setChecklist(prev => ({
        ...prev,
        "Step 2": "✅ 프로필 데이터 생성 시작"
      }));

      const profileData: UserProfile = {
        // 프로필 사진: user_metadata에서 가져오거나 빈 문자열 (빈 문자열이면 UI에서 아바타 아이콘 표시)
        profileImage: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        
        // 이름: user_metadata의 full_name 또는 name, 없으면 이메일의 앞부분 사용
        nickname: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email?.split('@')[0] || 
                  "사용자",
        
        // 이메일을 bio(한줄소개) 자리에 표시
        bio: user.email || "",
        
        // 가입일: created_at을 YYYY.MM 형식으로 변환
        joinDate: user.created_at ? formatJoinDate(user.created_at) : ""
      };

      setChecklist(prev => ({
        ...prev,
        "Step 2-1": `✅ 프로필 이미지: ${profileData.profileImage ? '있음' : '없음 (아바타 아이콘으로 대체)'}`,
        "Step 2-2": `✅ 닉네임: ${profileData.nickname}`,
        "Step 2-3": `✅ 이메일: ${profileData.bio}`,
        "Step 2-4": `✅ 가입일: ${profileData.joinDate}`
      }));

      // Step 3: 프로필 상태 업데이트
      setProfile(profileData);
      
      setChecklist(prev => ({
        ...prev,
        "Step 3": "✅ 프로필 데이터 상태 업데이트 완료",
        "완료": "✅ 모든 단계 완료 - Mock 데이터를 실제 데이터로 대체 성공"
      }));

    } catch (error) {
      console.error("프로필 조회 중 오류:", error);
      
      setChecklist(prev => ({
        ...prev,
        "Error": `❌ 오류 발생: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      }));

      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 가입일 포맷 함수: ISO 날짜를 YYYY.MM 형식으로 변환
  const formatJoinDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}.${month}`;
  };

  return {
    profile,
    isLoading,
    checklist,
    refetch: fetchUserProfile
  };
}
