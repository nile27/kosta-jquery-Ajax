/**
 * 조리식품 레시피 DB 연동 스크립트
 * 사용자 요구사항에 맞게 Jquery 및 Ajax로 구현
 */

import { API_KEY, SERVICE_ID } from "./env.js";

$(document).ready(function () {
    const DATA_TYPE = 'json';

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
    let globalTotalCount = 1140; // 초기값

    /**
     * 1. 초기화 함수
     * 이벤트 바인딩 및 초기 데이터 로드 실행
     */
    function init() {
        // 검색 이벤트 바인딩
        $('#searchBtn').on('click', executeSearch);
        $('#searchInput').on('keypress', function (e) {
            if (e.key === 'Enter') executeSearch();
        });

        // 로고 클릭시 상단 이동 및 초기화
        $('.logo').on('click', function (e) {
            e.preventDefault();
            $('#searchInput').val('');
            executeSearch();
        });

        // 모달 및 무한 스크롤 바인딩
        $('#modalCloseBtn').on('click', closeModal);
        $('#recipeModal').on('click', function (e) { if (e.target === this) closeModal(); });
        $(window).on('scroll', handleScroll);

        // 첫 데이터 로드
        fetchRecipes(true);
    }

    /**
     * 2. 검색 실행 함수
     * 상태를 초기화하고 새로운 조건으로 API를 호출합니다.
     */
    function executeSearch() {
        const keyword = $('#searchInput').val().trim();
        const type = $('#searchType').val();

        if (isLoading) return;

        // 검색 상태 초기화
        searchKeyword = keyword;
        searchType = type;
        startIndex = 1;
        endIndex = fetchCount;
        isFinished = false;
        recipeDataList = [];

        // UI 초기화
        $('#recipeListTitle').hide();
        $('#recipeGrid').empty();
        $('#noResultMessage').hide();
        $('#todayRecipeSection').hide();

        fetchRecipes(true);
    }

    /**
     * 3. API 호출 함수
     * Ajax를 전송하여 데이터를 가져오고 성공 여부에 따라 UI를 렌더링합니다.
     */
    function fetchRecipes(isInitialLoad = false) {
        if (isFinished || isLoading) return;

        isLoading = true;
        $('#loadingSpinner').fadeIn(200).addClass('visible');

        let apiUrl = `http://openapi.foodsafetykorea.go.kr/api/${API_KEY}/${SERVICE_ID}/${DATA_TYPE}/${startIndex}/${endIndex}`;

        if (searchKeyword !== '') {
            apiUrl += `/${searchType}=${encodeURIComponent(searchKeyword)}`;
        }

        return new Promise((resolve, reject) => {
            $.ajax({
                url: apiUrl,
                type: 'GET',
                dataType: 'json',
                success: function (response) {
                    const serviceResult = response[SERVICE_ID];
                    if (serviceResult && serviceResult.RESULT && serviceResult.RESULT.CODE === 'INFO-000') {
                        const dataTotal = parseInt(serviceResult.total_count);
                        globalTotalCount = dataTotal;
                        const rowList = serviceResult.row;

                        if (rowList && rowList.length > 0) {
                            $('#recipeListTitle').html(`<i class="fa-solid fa-utensils"></i> 레시피 탐색 <span style="font-size: 1.1rem; color: var(--primary-color); font-weight: 500; margin-left: 10px;">(총 ${dataTotal}개)</span>`).show();

                            // 초기 로드 시 추천 메뉴 선정
                            if (isInitialLoad && searchKeyword === '') {
                                const randomIndices = [];
                                while (randomIndices.length < 2) {
                                    const r = Math.floor(Math.random() * rowList.length);
                                    if (randomIndices.indexOf(r) === -1) randomIndices.push(r);
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
                        resolve(false);
                    }
                },
                error: function (xhr, status, error) {
                    resolve(false);
                },
                complete: function () {
                    isLoading = false;
                    $('#loadingSpinner').fadeOut(200).removeClass('visible');

                    if (isFinished && !isInitialLoad) {
                        $('#loadingText').text('모든 레시피를 확인했습니다.');
                    }
                }
            });
        });
    }

    /**
     * 4. 추천 메뉴 렌더링 함수
     * 상단 오늘의 추천 섹션의 데이터를 매핑합니다.
     */
    function renderTodayRecipe(recipe, type) {
        if (!recipe) return;

        const isLunch = type === 'lunch';
        const $card = isLunch ? $('#lunchRecipeCard') : $('#dinnerRecipeCard');

        const $img = $card.find('.today-img');

        $img.off('load error').on('load', function () {
            $(this).addClass('loaded');
            $card.removeClass('loading');
        }).on('error', function () {
            $(this).attr('src', 'https://via.placeholder.com/800x400?text=Image+Not+Found').addClass('loaded');
            $card.removeClass('loading');
        });

        $img.attr('src', recipe.ATT_FILE_NO_MK || recipe.ATT_FILE_NO_MAIN || 'https://via.placeholder.com/800x400?text=No+Image')
            .attr('alt', recipe.RCP_NM || '이미지 준비 중');

        $card.find('.today-title').text(recipe.RCP_NM || '메뉴 정보 없음');
        $card.find('.category').html(`<i class="fa-solid fa-utensils"></i> ${recipe.RCP_PAT2 || '기타'}`);
        $card.find('.today-desc').text(recipe.RCP_PARTS_DTLS ? recipe.RCP_PARTS_DTLS.substring(0, 80) + '...' : '재료 정보가 제공되지 않았습니다.');
        $card.find('.card-stats span').html(`<i class="fa-solid fa-fire"></i> ${recipe.INFO_ENG || '0'} kcal`);

        $card.off('click').on('click', function () {
            showModal(recipe);
        });

        $('#todayRecipeSection').show();
    }

    /**
     * 5. 레시피 카드 목록 렌더링 함수
     * 검색 결과 및 무한 스크롤용 카드를 생성하여 그리드에 추가합니다.
     */
    function renderRecipeCards(recipeList) {
        const $grid = $('#recipeGrid');

        $.each(recipeList, function (_, recipe) {
            let tagsHtml = '';
            if (recipe.HASH_TAG) {
                const tags = recipe.HASH_TAG.split(',');
                for (let i = 0; i < Math.min(tags.length, 3); i++) {
                    if (tags[i].trim()) {
                        tagsHtml += `<span class="badge" style="background: var(--secondary-color); color: var(--primary-color); padding: 4px 10px; font-size: 0.75rem;"><i class="fa-solid fa-hashtag"></i>${tags[i].trim()}</span>`;
                    }
                }
            } else {
                tagsHtml += `<span class="badge" style="background: var(--slate-50); color: var(--slate-500); padding: 4px 10px; font-size: 0.75rem;">${recipe.RCP_PAT2 || '기타'}</span>`;
            }

            const cardHtml = `
                <div class="recipe-card" data-seq="${recipe.RCP_SEQ}">
                    <div class="card-img-wrapper">
                        <img src="${recipe.ATT_FILE_NO_MAIN || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${recipe.RCP_NM}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300?text=Image+Not+Found'">
                    </div>
                    <div class="card-body">
                        <div class="card-tags">${tagsHtml}</div>
                        <h3 class="card-title">${recipe.RCP_NM}</h3>
                        <div class="card-footer">
                            <div class="card-stats">
                                <span><i class="fa-solid fa-fire"></i> ${recipe.INFO_ENG || '0'} kcal</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const $card = $(cardHtml);
            $grid.append($card);

            $card.on('click', function () {
                const seq = $(this).data('seq');
                const targetRecipe = recipeDataList.find(r => r.RCP_SEQ == seq);
                if (targetRecipe) {
                    showModal(targetRecipe);
                }
            });
        });
    }

    /**
     * 6. 무한 스크롤 핸들러
     */
    function handleScroll() {
        if (isLoading || isFinished) return;

        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
        const documentHeight = $(document).height();

        if (scrollTop + windowHeight >= documentHeight - 500) {
            fetchRecipes(false);
        }
    }

    /**
     * 7. 상세정보 모달 표시
     */
    function showModal(recipe) {
        const $modalBody = $('#modalBody');
        $modalBody.empty();

        const manualStepsHtml = [];
        for (let i = 1; i <= 20; i++) {
            const stepNum = i < 10 ? '0' + i : i;
            const manualText = recipe[`MANUAL${stepNum}`];
            const manualImg = recipe[`MANUAL_IMG${stepNum}`];

            if (manualText && manualText.trim() !== '') {
                let stepHtml = `<div class="step-item">`;
                stepHtml += `<div class="step-text">${manualText}</div>`;

                if (manualImg) {
                    stepHtml += `<img src="${manualImg}" alt="조리과정 ${i}" class="step-img" loading="lazy" onerror="this.style.display='none'">`;
                }

                stepHtml += `</div>`;
                manualStepsHtml.push(stepHtml);
            }
        }

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
        $('#recipeModal').fadeIn(200);
        $('body').css('overflow', 'hidden');
    }

    /**
     * 8. 모달 닫기
     */
    function closeModal() {
        $('#recipeModal').fadeOut(200);
        $('body').css('overflow', 'auto');
    }

    init();
});
