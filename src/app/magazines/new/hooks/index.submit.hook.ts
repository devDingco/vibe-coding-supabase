import { supabase } from '@/lib/supabase';

export interface MagazineFormData {
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[] | null;
}

export interface SubmitResult {
  success: boolean;
  magazineId?: string;
  error?: string;
}

/**
 * 매거진 등록 훅
 * Supabase magazine 테이블에 데이터를 등록하고 결과를 반환합니다.
 */
export async function useSubmitMagazine(data: MagazineFormData): Promise<SubmitResult> {
  try {
    // 1. magazine 테이블에 데이터 삽입
    const { data: insertedData, error } = await supabase
      .from('magazine')
      .insert({
        category: data.category,
        title: data.title,
        description: data.description,
        content: data.content,
        tags: data.tags,
        // image_url은 무시 (요구사항에 따라)
      })
      .select('id')
      .single();

    // 2. 에러 처리
    if (error) {
      console.error('매거진 등록 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // 3. 성공 처리
    return {
      success: true,
      magazineId: insertedData?.id,
    };
  } catch (error) {
    console.error('매거진 등록 중 예외 발생:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

