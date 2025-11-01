'use client';

import { ArrowLeft } from "lucide-react";
import { useMagazineDetail } from './hooks/index.func.binding';

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    "인공지능": "magazine-category-ai",
    "웹개발": "magazine-category-web",
    "클라우드": "magazine-category-cloud",
    "보안": "magazine-category-security",
    "모바일": "magazine-category-mobile",
    "데이터사이언스": "magazine-category-data",
    "블록체인": "magazine-category-blockchain",
    "DevOps": "magazine-category-devops",
  };
  
  return colorMap[category] || "magazine-category-default";
};

export default function GlossaryCardsDetail({ params }: { params: { id: string } }) {
  const { data: magazine, loading, error } = useMagazineDetail(params.id);

  const onNavigateToList = () => {
    window.location.href = '/magazines';
  };

  if (loading) {
    return (
      <div className="magazine-detail-container">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !magazine) {
    return (
      <div className="magazine-detail-container">
        <button className="magazine-detail-back" onClick={onNavigateToList}>
          <ArrowLeft className="magazine-detail-back-icon" />
          <span>목록으로</span>
        </button>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-lg text-red-500">
            {error || '데이터를 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  // content를 문단별로 분리 (줄바꿈 기준)
  const contentParagraphs = magazine.content.split('\n').filter(p => p.trim());

  return (
    <div className="magazine-detail-container">
      <button className="magazine-detail-back" onClick={onNavigateToList}>
        <ArrowLeft className="magazine-detail-back-icon" />
        <span>목록으로</span>
      </button>

      <article className="magazine-detail-article">
        <div className="magazine-detail-hero">
          {magazine.image_url && (
            <img 
              src={magazine.image_url}
              alt={magazine.title}
            />
          )}
          <div className="magazine-detail-hero-overlay"></div>
          <div className={`magazine-detail-category ${getCategoryColor(magazine.category)}`}>
            {magazine.category}
          </div>
        </div>

        <div className="magazine-detail-content-wrapper">
          <h1 className="magazine-detail-title">{magazine.title}</h1>
          
          <p className="magazine-detail-summary">{magazine.description}</p>

          <div className="magazine-detail-content">
            {contentParagraphs.map((paragraph, index) => (
              <p key={index} className="magazine-detail-paragraph">
                {paragraph}
              </p>
            ))}
          </div>

          {magazine.tags && magazine.tags.length > 0 && (
            <div className="magazine-detail-tags">
              {magazine.tags.map((tag, index) => (
                <span key={index} className="magazine-detail-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      <div className="magazine-detail-footer">
        <button className="magazine-detail-back-bottom" onClick={onNavigateToList}>
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
