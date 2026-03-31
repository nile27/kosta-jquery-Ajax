/**
 * 조리식품 레시피 DB 연동 스크립트
 * 사용자 요구사항에 맞게 Jquery 및 Ajax로 구현
 */

import { API_KEY, SERVICE_ID } from "./env.js";

$(document).ready(function () {
    // API 설정 정보
    // const API_KEY = API_KEY;
    // const SERVICE_ID = 'COOKRCP01';
    const DATA_TYPE = 'json';

    console.log("APi_key" , API_KEY)
    
    // 상태 관리 변수
    let startIndex = 1;         // 요청 시작 인덱스
    let endIndex = 8;           // 요청 종료 인덱스 (한 번에 8개씩 로드)
    const fetchCount = 8;       // 한 번에 가져올 데이터 개수
    let isLoading = false;      // 데이터 로딩 중인지 여부 (중복 호출 방지)
    let isFinished = false;     // 모든 데이터를 다 불러왔는지 여부
    let searchKeyword = '';     // 현재 검색어
    let searchType = 'RCP_NM';  // 현재 검색 조건 (메뉴명 OR 재료명)
    
    // 데이터 저장용 배열 (상세보기를 위해 원본 데이터 유지)
    let recipeDataList = [];
    let globalTotalCount = 1140; // 초기값 (하단 리스트 호출 후 업데이트됨)

    // 1. 초기화 함수 (정적 템플릿 기반으로 단순화)
    function init() {
        console.log("레시피 앱 초기화 (정적 템플릿 기반)");
        
        // 검색 이벤트 바인딩
        $('#searchBtn').on('click', executeSearch);
        $('#searchInput').on('keypress', function(e) {
            if (e.key === 'Enter') executeSearch();
        });
        
        // 로고 클릭시 홈으로
        $('.logo').on('click', function(e) {
            e.preventDefault();
            $('#searchInput').val('');
            executeSearch();
        });

        // 모달 닫기 및 무한 스크롤 바인딩
        $('#modalCloseBtn').on('click', closeModal);
        $('#recipeModal').on('click', function(e) { if (e.target === this) closeModal(); });
        $(window).on('scroll', handleScroll);

        // 첫 데이터 로드 (추천 메뉴는 이 안에서 처리됨)
        fetchRecipes(true);
    }

    // 2. 검색 실행 함수
    function executeSearch() {
        const keyword = $('#searchInput').val().trim();
        const type = $('#searchType').val();
        
        // 로딩 중이면 무시
        if (isLoading) return;
        
        console.log(`검색 실행: ${type} = ${keyword}`);
        
        // 상태 초기화
        searchKeyword = keyword;
        searchType = type;
        startIndex = 1;
        endIndex = fetchCount;
        isFinished = false;
        recipeDataList = []; // 데이터 캐시 초기화
        
        // UI 초기화
        $('#recipeListTitle').hide();
        $('#recipeGrid').empty();
        $('#noResultMessage').hide();
        $('#todayRecipeSection').hide(); // 검색 시에는 추천메뉴 섹션을 숨김
        
        // 1페이지 로드
        fetchRecipes(true);
    }

    // 3. API 호출 함수
    function fetchRecipes(isInitialLoad = false) {
        if (isFinished || isLoading) return;
        
        isLoading = true;
        $('#loadingSpinner').show();
        
        // API URL 구성
        let apiUrl = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/${SERVICE_ID}/${DATA_TYPE}/${startIndex}/${endIndex}`;
        
        // 검색어가 있을 경우 파라미터 추가
        if (searchKeyword !== '') {
            apiUrl += `/${searchType}=${encodeURIComponent(searchKeyword)}`;
        }
        
        console.log(`API 요청: ${apiUrl}`);
        
        // Ajax 통신을 Promise로 래핑하여 반환
        return new Promise((resolve, reject) => {
            $.ajax({
                url: apiUrl,
                type: 'GET',
                dataType: 'json',
                success: function(response) {
                    const serviceResult = response[SERVICE_ID];
                    if (serviceResult && serviceResult.RESULT && serviceResult.RESULT.CODE === 'INFO-000') {
                        const dataTotal = parseInt(serviceResult.total_count);
                        globalTotalCount = dataTotal; // 전체 개수 업데이트
                        const rowList = serviceResult.row;
                        
                        if (rowList && rowList.length > 0) {
                            $('#recipeListTitle').html(`<i class="fa-solid fa-utensils"></i> 레시피 탐색 <span style="font-size: 1.1rem; color: var(--primary-color); font-weight: 500; margin-left: 10px;">(총 ${dataTotal}개)</span>`);
                            
                            // 초기 로드 시 8개 데이터 중 랜덤으로 추천 메뉴 선정
                            if (isInitialLoad && searchKeyword === '') {
                                const randomIndices = [];
                                while(randomIndices.length < 2) {
                                    const r = Math.floor(Math.random() * rowList.length);
                                    if(randomIndices.indexOf(r) === -1) randomIndices.push(r);
                                }
                                renderTodayRecipe(rowList[randomIndices[0]], 'lunch');
                                renderTodayRecipe(rowList[randomIndices[1]], 'dinner');
                            }

                            renderRecipeCards(rowList);
                            recipeDataList = recipeDataList.concat(rowList);
                            
                            if (endIndex >= dataTotal) isFinished = true;
                            else {
                                startIndex = endIndex + 1;
                                endIndex = startIndex + fetchCount - 1;
                            }
                        } else {
                            if (isInitialLoad) $('#noResultMessage').show();
                            isFinished = true;
                        }
                        resolve(true);
                    } else if (serviceResult && serviceResult.RESULT && serviceResult.RESULT.CODE === 'INFO-200') {
                        if (isInitialLoad) $('#noResultMessage').show();
                        isFinished = true;
                        resolve(false);
                    } else {
                        console.error("API 응답 에러:", response);
                        resolve(false);
                    }
                },
                error: function(xhr, status, error) {
                    console.error("Ajax 에러:", error);
                    resolve(false);
                },
                complete: function() {
                    isLoading = false;
                    // 개별 로딩일 때는 여기서 스피너를 끄지만, 초기 로딩은 init에서 제어함
                    if (!isInitialLoad) $('#loadingSpinner').hide();
                }
            });
        });
    }

    // 4. 오늘의 추천 메뉴 매핑 함수 (정적 템플릿 업데이트)
    function renderTodayRecipe(recipe, type) {
        if (!recipe) return;
        
        const isLunch = type === 'lunch';
        if (!isLunch) console.log("저녁 메뉴 렌더링 시도:", recipe);
        const $card = isLunch ? $('#lunchRecipeCard') : $('#dinnerRecipeCard');
        
        // 정적 템플릿 내부 요소 업데이트
        $card.removeClass('placeholder'); // 구형 클래스 제거
        const $img = $card.find('.today-img');
        
        // 이미지 로딩 처리
        $img.off('load error').on('load', function() {
            $(this).addClass('loaded');
            $card.removeClass('loading'); // 스켈레톤 제거
        }).on('error', function() {
            $(this).attr('src', 'https://via.placeholder.com/800x400?text=Image+Not+Found').addClass('loaded');
            $card.removeClass('loading');
        });

        $img.attr('src', recipe.ATT_FILE_NO_MK || recipe.ATT_FILE_NO_MAIN || 'https://via.placeholder.com/800x400?text=No+Image')
            .attr('alt', recipe.RCP_NM || '이미지 준비 중');

        $card.find('.today-title').text(recipe.RCP_NM || '메뉴 정보 없음');
        $card.find('.category').html(`<i class="fa-solid fa-utensils"></i> ${recipe.RCP_PAT2 || '기타'}`);
        $card.find('.today-desc').text(recipe.RCP_PARTS_DTLS ? recipe.RCP_PARTS_DTLS.substring(0, 80) + '...' : '재료 정보가 제공되지 않았습니다.');
        $card.find('.card-stats span').html(`<i class="fa-solid fa-fire"></i> ${recipe.INFO_ENG || '0'} kcal`);
        
        // 추천 카드 클릭 시 상세 모달 오픈
        $card.off('click').on('click', function() {
            showModal(recipe);
        });
        
        $('#todayRecipeSection').show(); // 빠른 노출을 위해 slideDown 대신 show 사용
    }

    // 4.5 추천 메뉴 전용 재시도(Retry) 포함 비동기 함수
    async function fetchRecipeWithRetry(type, maxRetries = 10) {
        let retries = 0;
        while (retries < maxRetries) {
            // 전역 변수를 활용한 정확한 랜덤 범위 설정
            const randomIdx = Math.floor(Math.random() * globalTotalCount) + 1;
            console.log(`[${type}] 추천 메뉴 시도 (${retries + 1}/${maxRetries}): Index ${randomIdx}`);
            
            try {
                const recipe = await new Promise((resolve, reject) => {
                    const url = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/${SERVICE_ID}/${DATA_TYPE}/${randomIdx}/${randomIdx}`;
                    $.ajax({
                        url: url,
                        type: 'GET',
                        dataType: 'json',
                        timeout: 10000,
                        success: function(res) {
                            console.log(`[${type}] API 응답 수신:`, res);
                            const serviceResult = res[SERVICE_ID];
                            if (serviceResult && serviceResult.row && serviceResult.row.length > 0) {
                                resolve(serviceResult.row[0]);
                            } else {
                                console.warn(`[${type}] 인덱스 ${randomIdx}에 데이터가 없습니다.`);
                                resolve(null);
                            }
                        },
                        error: (xhr, status, err) => {
                            console.error(`[${type}] API 호출 오류 (상태: ${status}):`, err);
                            reject(err);
                        }
                    });
                });

                if (recipe) {
                    if (type === 'dinner') console.log("저녁 메뉴 데이터 수신 성공:", recipe);
                    renderTodayRecipe(recipe, type);
                    return recipe; // 성공 시 종료
                }
            } catch (error) {
                console.warn(`[${type}] 호출 실패, 재시도 중...`, error);
            }
            retries++;
        }
        console.error(`[${type}] ${maxRetries}회 재시도에도 불구하고 데이터를 가져오지 못했습니다.`);
        return null;
    }

    // 5. 레시피 카드 목록 렌더링 함수
    function renderRecipeCards(recipeList) {
        const $grid = $('#recipeGrid');
        
        $.each(recipeList, function(index, recipe) {
            // 태그 배열로 분리 (쉼표 기준)
            let tagsHtml = '';
            if (recipe.HASH_TAG) {
                const tags = recipe.HASH_TAG.split(',');
                // 최대 3개까지만 표시
                for (let i = 0; i < Math.min(tags.length, 3); i++) {
                    if (tags[i].trim()) {
                        tagsHtml += `<span class="badge" style="background-color: var(--secondary-color); color: var(--dark-green); padding: 3px 8px; font-size: 0.75rem;"><i class="fa-solid fa-hashtag"></i>${tags[i].trim()}</span>`;
                    }
                }
            } else {
                tagsHtml = `<span class="badge" style="background-color: #f1f5f9; color: var(--text-muted); padding: 3px 8px; font-size: 0.75rem;">${recipe.RCP_PAT2 || '기타'}</span>`;
            }
            
            const cardHtml = `
                <div class="recipe-card" data-seq="${recipe.RCP_SEQ}">
                    <img src="${recipe.ATT_FILE_NO_MAIN || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${recipe.RCP_NM}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">
                    <div class="card-body">
                        <div class="card-tags">${tagsHtml}</div>
                        <h3 class="card-title">${recipe.RCP_NM}</h3>
                        <div class="card-stats">
                            <span><i class="fa-solid fa-scale-balanced"></i> ${recipe.INFO_WGT || '0'}g</span>
                            <span><i class="fa-solid fa-fire"></i> ${recipe.INFO_ENG || '0'} kcal</span>
                        </div>
                    </div>
                </div>
            `;
            
            const $card = $(cardHtml);
            $grid.append($card);
            
            // 카드 클릭 이벤트 (클로저 문제 해결을 위해 data 속성 이용하거나 직접 바인딩)
            $card.on('click', function() {
                // 저장된 배열에서 해당 레시피 찾기
                const seq = $(this).data('seq');
                const targetRecipe = recipeDataList.find(r => r.RCP_SEQ == seq);
                if (targetRecipe) {
                    showModal(targetRecipe);
                }
            });
        });
    }

    // 6. 무한 스크롤 핸들러 (스크롤이 바닥에 닿을 쯤 추가 데이터 로드)
    function handleScroll() {
        if (isLoading || isFinished) return;
        
        // 문서 전체 높이와 현재 스크롤 위치 계산
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const documentHeight = $(document).height();
        
        // 바닥에서 200px 정도 남았을 때 로드 시작
        if (scrollTop + windowHeight >= documentHeight - 200) {
            fetchRecipes(false);
        }
    }

    // 7. 상세정보 모달 표시
    function showModal(recipe) {
        const $modalBody = $('#modalBody');
        $modalBody.empty(); // 기존 내용 비우기
        
        // 조리 과정 단계별(MANUAL01 ~ MANUAL20) 배열 생성
        const manualStepsHtml = [];
        for (let i = 1; i <= 20; i++) {
            // 키 값이 01, 02 형태
            const stepNum = i < 10 ? '0' + i : i;
            const manualText = recipe[`MANUAL${stepNum}`];
            const manualImg = recipe[`MANUAL_IMG${stepNum}`];
            
            // 데이터가 있는 경우에만 추가
            if (manualText && manualText.trim() !== '') {
                // 텍스트 앞의 "1. " 형태 제거 (이미 디자인으로 처리할 것이므로)
                const cleanText = manualText.replace(/^[0-9]+\.\s*/, '');
                
                let stepHtml = `<div class="step-item">`;
                // 원본 설명 그대로 사용 (숫자 포함되어있음)
                stepHtml += `<div class="step-text">${manualText}</div>`;
                
                if (manualImg) {
                    stepHtml += `<img src="${manualImg}" alt="조리과정 ${i}" class="step-img" loading="lazy" onerror="this.style.display='none'">`;
                }
                
                stepHtml += `</div>`;
                manualStepsHtml.push(stepHtml);
            }
        }

        // 모달 컨텐츠 HTML 구성
        const modalHtml = `
            <img src="${recipe.ATT_FILE_NO_MK || recipe.ATT_FILE_NO_MAIN || 'https://via.placeholder.com/800x400'}" alt="${recipe.RCP_NM}" class="modal-header-img" onerror="this.src='https://via.placeholder.com/800x400?text=Image+Not+Found'">
            
            <div class="modal-info">
                <div class="modal-title-area">
                    <span class="badge" style="margin-bottom: 10px;">${recipe.RCP_PAT2 || '기타'} | ${recipe.RCP_WAY2 || '기타'}</span>
                    <h2 class="modal-title">${recipe.RCP_NM}</h2>
                    ${recipe.HASH_TAG ? `<p style="color: var(--primary-color); font-weight: 500;">${recipe.HASH_TAG}</p>` : ''}
                </div>

                <div class="nutrient-grid">
                    <div class="nutrient-item">
                        <div class="nutrient-label">열량</div>
                        <div class="nutrient-value">${recipe.INFO_ENG || '0'} kcal</div>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-label">탄수화물</div>
                        <div class="nutrient-value">${recipe.INFO_CAR || '0'} g</div>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-label">단백질</div>
                        <div class="nutrient-value">${recipe.INFO_PRO || '0'} g</div>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-label">지방</div>
                        <div class="nutrient-value">${recipe.INFO_FAT || '0'} g</div>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-label">나트륨</div>
                        <div class="nutrient-value">${recipe.INFO_NA || '0'} mg</div>
                    </div>
                    <div class="nutrient-item">
                        <div class="nutrient-label">1인분 중량</div>
                        <div class="nutrient-value">${recipe.INFO_WGT || '0'} g</div>
                    </div>
                </div>

                <div class="ingredients">
                    <h3><i class="fa-solid fa-basket-shopping"></i> 재료 정보</h3>
                    <div class="ingredients-text">
                        ${recipe.RCP_PARTS_DTLS ? recipe.RCP_PARTS_DTLS.replace(/\n/g, '<br>') : '재료 정보가 제공되지 않았습니다.'}
                    </div>
                </div>

                <div class="recipe-steps">
                    <h3><i class="fa-solid fa-fire-burner"></i> 만드는 법 (${manualStepsHtml.length}단계)</h3>
                    <div class="step-list">
                        ${manualStepsHtml.length > 0 ? manualStepsHtml.join('') : '<p>조리법 정보가 없습니다.</p>'}
                    </div>
                </div>
            </div>
        `;

        $modalBody.html(modalHtml);
        
        // 모달 표시 (fade-in 애니메이션을 위해 display 변경 후 opacity/transform 적용되게 설정)
        $('#recipeModal').fadeIn(200);
        // 배경 스크롤 방지
        $('body').css('overflow', 'hidden');
    }

    // 8. 모달 닫기
    function closeModal() {
        $('#recipeModal').fadeOut(200);
        // 배경 스크롤 원복
        $('body').css('overflow', 'auto');
    }

    // 초기화 실행
    init();
});
