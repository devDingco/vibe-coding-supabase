import { supabase } from '@/lib/supabase';

export interface MagazineFormData {
  imageFile: File | null;
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
    let imageUrl: string | null = null;

    // 1. 이미지 파일이 있으면 Supabase Storage에 업로드
    if (data.imageFile) {
      // 1-1. 파일명 생성: yyyy/mm/dd/{UUID}.jpg
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const uuid = crypto.randomUUID();
      const filePath = `${year}/${month}/${day}/${uuid}.jpg`;

      // 1-2. Supabase Storage 버킷에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vibe-coding-supabase-storage')
        .upload(filePath, data.imageFile, {
          contentType: data.imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('이미지 업로드 실패:', uploadError);
        return {
          success: false,
          error: `이미지 업로드 실패: ${uploadError.message}`,
        };
      }

      // 1-3. 업로드된 이미지의 public URL 가져오기
      const { data: publicUrlData } = supabase.storage
        .from('vibe-coding-supabase-storage')
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    // 2. magazine 테이블에 데이터 삽입
    const { data: insertedData, error } = await supabase
      .from('magazine')
      .insert({
        image_url: imageUrl,
        category: data.category,
        title: data.title,
        description: data.description,
        content: data.content,
        tags: data.tags,
      })
      .select('id')
      .single();

    // 3. 에러 처리
    if (error) {
      console.error('매거진 등록 실패:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // 4. 성공 처리
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

