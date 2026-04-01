# Stitch "Recipe" Design System

이 문서는 조리식품 레시피 애플리케이션의 시각적 고사양화를 위한 **Stitch** 전용 디자인 가이드라인을 정의합니다.

## 1. 브랜드 아이덴티티
* **시각적 톤**: 현대적, 정교함, 기술 기반, 고화질(Premium)
* **키워드**: 신뢰할 수 있는(Trustworthy), 신속한(Responsive), 직관적인(Intuitive)

## 2. 컬러 팔레트 (라이트 모드)
* **Primary (브랜드 색상)**: `#4F46E5` (Indigo) - 주요 버튼, 활성 상태, 강조 텍스트
* **Secondary (포인트 색상)**: `#8B5CF6` (Violet) - 부가적인 강조, 장식적 요소
* **Background (배경)**: `#FFFFFF` (Main Content Area), `#F8FAFC` (Secondary Surface)
* **Text (Primary)**: `#0F172A` (Slate 900) - 주요 가독성 텍스트
* **Text (Muted)**: `#64748B` (Slate 500) - 보조 설명 및 메타 정보
* **Glassmorphism**: `rgba(255, 255, 255, 0.7)` 배경과 `backdrop-filter: blur(12px)` 조합

## 3. 타이포그래피
* **기본 폰트**: 'Pretendard', sans-serif (범용성 및 가독성)
* **헤드라인 (Title)**: 2.2rem, Semi-bold, Letter-spacing -0.02em
* **본문 (Body)**: 1rem, Medium (500), Line-height 1.6
* **카드 텍스트**: 0.9rem, Regular (400), Slate 500

## 4. 간격 및 레이아웃
* **Border Radius**: 24px (모든 주요 카드), 16px (입력 필드 및 버튼)
* **Ambient Shadow**: `0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)`
* **Floating Header**: 64px 높이, Glassmorphism 효과

## 5. 컴포넌트 스타일
### Buttons
* **Stitch Primary**: Indigo 배경, 흰색 텍스트, 16px 곡률, 미세한 발광(Glow) 효과
* **Stitch Secondary**: 연한 Indigo/Violet 배경, Indigo 텍스트

### Search Bar
* 캡슐 형태(50px 곡률), 은은한 안쪽 그림자, Glassmorphism 배경

### Recipe Cards
* 높은 곡률(24px), 이미지 상단 오버레이, 하단 통계 정보의 여백 증가

## 6. 인터랙션 가이드
* **부드러운 전환**: `cubic-bezier(0.4, 0, 0.2, 1)` 적용 (250ms)
* **카드 인터랙션**: Hover 시 살짝 떠오르며(Scale 1.02), 그림자가 깊어지는 효과
* **로딩**: 정교한 스켈레톤 디자인 대신 부드러운 페이드인 애니메이션 선호
