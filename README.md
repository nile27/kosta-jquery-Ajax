# 🥗 Fresh Recipe — jQuery & AJAX 활용 프로젝트 발표

> **조리식품 레시피 DB** 오픈 API를 jQuery와 AJAX로 연동한 레시피 탐색 웹 서비스

---

## 📌 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [프로젝트 구조 및 핵심 기능](#4-프로젝트-구조-및-핵심-기능)
3. [기능별 코드 분석](#5-기능별-코드-분석)
4. [구현 시 어려웠던 점 & 해결](#6-구현-시-어려웠던-점--해결)


---

## 1. 프로젝트 소개

| 항목 | 내용 |
|------|------|
| **서비스명** | Fresh Recipe |
| **사용 API** | 식품안전나라(Food Safety Korea) 오픈 API |
| **핵심 기술** | jQuery 3.7, AJAX, HTML5, CSS3 |
| **주요 기능** | 레시피 검색, 무한 스크롤, 오늘의 추천, 상세 모달 |

### 서비스 흐름

```
사용자 접속
    │
    ▼
init() 실행 → 이벤트 바인딩 완료
    │
    ▼
fetchRecipes(true) → AJAX로 API 호출
    │
    ▼
응답 데이터 수신 → 레시피 카드 렌더링
    │
    ▼
스크롤 감지 → 추가 데이터 자동 로드 (무한 스크롤)
```


## 2. 프로젝트 구조 및 핵심 기능

```
Fresh Recipe/
├── index.html        ← 전체 UI 구조 (정적 템플릿)
├── style.css         ← 디자인 시스템 (CSS 변수 기반)
├── script.js         ← 핵심 로직 (jQuery + AJAX)
└── env.js            ← API 키 관리
```

### 핵심 기능 5가지

```
┌─────────────────────────────────────────────────┐
│  1. init()           → 앱 초기화 & 이벤트 바인딩  │
│  2. fetchRecipes()   → AJAX API 호출 (핵심!)      │
│  3. executeSearch()  → 검색 상태 초기화 & 재요청  │
│  4. handleScroll()   → 무한 스크롤 트리거         │
│  5. showModal()      → 상세보기 모달 렌더링        │
└─────────────────────────────────────────────────┘
```

---

## 3. 기능별 코드 분석

### ① 초기화 — `init()`

앱이 로드되자마자 **모든 이벤트를 한 곳에서 등록**합니다.

```javascript
function init() {
    // 검색 버튼 & 엔터키 바인딩
    $('#searchBtn').on('click', executeSearch);
    $('#searchInput').on('keypress', function(e) {
        if (e.key === 'Enter') executeSearch();
    });

    // 무한 스크롤 등록
    $(window).on('scroll', handleScroll);

    // 모달 닫기
    $('#modalCloseBtn').on('click', closeModal);

    // 첫 데이터 로드 (isInitialLoad = true)
    fetchRecipes(true);
}
```

**포인트:** `$(document).ready()` 안에서 `init()`을 호출 → HTML이 완전히 로드된 뒤 실행 보장

---

### ② AJAX API 연동 — `fetchRecipes()`

프로젝트의 **핵심 함수**. jQuery의 `$.ajax()`를 ES6 Promise로 감싸 비동기 흐름을 제어합니다.

```javascript
function fetchRecipes(isInitialLoad = false) {
    // 1. 중복 호출 방지 (Lock)
    if (isFinished || isLoading) return;
    isLoading = true;

    // 2. API URL 동적 생성 (검색어 있으면 필터 추가)
    let apiUrl = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/.../${startIndex}/${endIndex}`;
    if (searchKeyword !== '') {
        apiUrl += `/${searchType}=${encodeURIComponent(searchKeyword)}`;
    }

    // 3. AJAX 요청
    $.ajax({
        url: apiUrl,
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            // 응답 코드 확인 후 렌더링
            if (response[SERVICE_ID].RESULT.CODE === 'INFO-000') {
                renderRecipeCards(response[SERVICE_ID].row);
            }
        },
        complete: function() {
            // 성공/실패 무관하게 반드시 로딩 해제
            isLoading = false;
            $('#loadingSpinner').fadeOut(200);
        }
    });
}
```

**포인트:**
- `isLoading` 플래그 → API 중복 호출 방지 
- `complete` 콜백 → 에러가 나도 스피너가 무조건 사라짐
- `encodeURIComponent` → 한글 검색어 인코딩 처리

---

### ③ 검색 — `executeSearch()`

검색 시 **기존 상태를 완전히 초기화**하고 새로운 조건으로 다시 시작합니다.

```javascript
function executeSearch() {
    if (isLoading) return; // 로딩 중엔 무시

    // 상태 초기화
    searchKeyword = $('#searchInput').val().trim();
    startIndex = 1;
    endIndex = 8;
    isFinished = false;
    recipeDataList = [];

    // 화면 초기화
    $('#recipeGrid').empty();
    $('#noResultMessage').hide();

    fetchRecipes(true); // 새 조건으로 재요청
}
```

---

### ④ 무한 스크롤 — `handleScroll()`

스크롤 위치를 계산해 **하단 500px 전**에 다음 데이터를 미리 요청합니다.

```javascript
function handleScroll() {
    if (isLoading || isFinished) return; // 불필요한 실행 차단

    const scrollTop    = $(window).scrollTop();   // 현재 스크롤 위치
    const windowHeight = $(window).height();       // 화면 높이
    const documentHeight = $(document).height();  // 전체 문서 높이

    //  ┌─────────────────────┐ ← documentHeight
    //  │                     │
    //  │      본문 내용       │
    //  │                     │
    //  ├─────────────────────┤ ← scrollTop + windowHeight (현재 화면 하단)
    //  │   ← 500px 여유 →   │ ← 이 지점부터 다음 요청
    //  └─────────────────────┘

    if (scrollTop + windowHeight >= documentHeight - 500) {
        fetchRecipes(false);
    }
}
```

---

### ⑤ 상세 모달 — `showModal()`

카드 클릭 시 `recipeDataList`에 저장된 데이터를 꺼내 **추가 API 호출 없이** 모달을 구성합니다.

```javascript
function showModal(recipe) {
    // 최대 20단계 조리법 동적 생성
    for (let i = 1; i <= 20; i++) {
        const stepNum = i < 10 ? '0' + i : i;
        const manualText = recipe[`MANUAL${stepNum}`]; // 대괄호 표기법으로 동적 키 접근
        if (manualText && manualText.trim() !== '') {
            // 단계별 HTML 추가
        }
    }

    $('#recipeModal').fadeIn(200);      // jQuery 애니메이션
    $('body').css('overflow', 'hidden'); // 배경 스크롤 고정
}
```

**포인트:** 이미 `recipeDataList`에 저장된 데이터 활용 → 모달 열 때 추가 API 호출 0회

---

## 4. 구현 시 어려웠던 점 & 해결

### 문제 1. 중복 AJAX 호출 — 레이스 컨디션

스크롤을 빠르게 내리면 AJAX 요청이 여러 번 겹쳐서 데이터가 중복 렌더링됨

```javascript
// 해결: isLoading 플래그로 Lock 구현
if (isLoading || isFinished) return;
isLoading = true;  // 요청 시작 시 잠금
// ...
isLoading = false; // complete 콜백에서 잠금 해제
```

### 문제 2. 로딩 스피너가 에러 시 사라지지 않음

`success`에서만 스피너를 숨기면 에러 발생 시 스피너가 영구히 표시됨

```javascript
// 해결: complete 콜백 사용 (성공/실패 무관하게 실행)
complete: function() {
    isLoading = false;
    $('#loadingSpinner').fadeOut(200); // 항상 실행됨
}
```

### 문제 3. 한글 검색어가 API에서 오류 발생

```javascript
// 해결: encodeURIComponent()로 URL 인코딩
apiUrl += `/${searchType}=${encodeURIComponent(searchKeyword)}`;
// "김치찌개" → "%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C"
```

---


*© 2026 Fresh Recipe — Food Safety Korea API 활용 프로젝트*
