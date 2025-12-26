// 게시판 CRUD 기능

// 현재 보고 있는 게시글 ID
let currentPostId = null;
// 수정 모드 여부
let isEditMode = false;
// 현재 게시글의 이미지 URL (수정 시 삭제용)
let currentImageUrl = null;

// 페이지네이션 설정
const POSTS_PER_PAGE = 10;
let currentPage = 1;
let totalPages = 1;
let currentSearchKeyword = '';

// 섹션 요소
const boardSection = document.getElementById('board-section');
const writeSection = document.getElementById('write-section');
const detailSection = document.getElementById('detail-section');

// ===== 화면 전환 함수 (해시 변경) =====
function showSection(section, updateHash = true) {
  boardSection.style.display = 'none';
  writeSection.style.display = 'none';
  detailSection.style.display = 'none';
  section.style.display = 'block';

  // URL 해시 업데이트
  if (updateHash) {
    if (section === boardSection) {
      history.pushState(null, '', 'board.html');
    } else if (section === writeSection) {
      if (isEditMode) {
        history.pushState(null, '', `#edit/${currentPostId}`);
      } else {
        history.pushState(null, '', '#write');
      }
    } else if (section === detailSection) {
      history.pushState(null, '', `#post/${currentPostId}`);
    }
  }
}

// ===== URL 해시에 따른 화면 표시 =====
async function handleHashChange() {
  const hash = window.location.hash;

  if (hash.startsWith('#post/')) {
    // 게시글 상세보기
    const postId = parseInt(hash.replace('#post/', ''));
    if (postId) {
      await viewPost(postId, false);
    }
  } else if (hash === '#write') {
    // 글쓰기
    await showWriteForm(false);
  } else if (hash.startsWith('#edit/')) {
    // 글 수정
    const postId = parseInt(hash.replace('#edit/', ''));
    if (postId) {
      currentPostId = postId;
      await showEditForm(false);
    }
  } else {
    // 목록
    showSection(boardSection, false);
    loadPosts(currentPage, currentSearchKeyword);
  }
}

// ===== 날짜 포맷 함수 =====
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===== Storage에서 이미지 삭제 =====
async function deleteImageFromStorage(imageUrl) {
  if (!imageUrl) return;

  try {
    // URL에서 파일 경로 추출
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/post-images/');
    if (pathParts.length < 2) return;

    const filePath = decodeURIComponent(pathParts[1]);

    const { error } = await supabaseClient
      .storage
      .from('post-images')
      .remove([filePath]);

    if (error) {
      console.error('이미지 삭제 실패:', error.message);
    }
  } catch (error) {
    console.error('이미지 삭제 중 오류:', error.message);
  }
}

// ===== 게시글 목록 조회 =====
async function loadPosts(page = 1, searchKeyword = '') {
  try {
    currentPage = page;
    currentSearchKeyword = searchKeyword;

    // 전체 개수 조회 (페이지네이션용)
    let countQuery = supabaseClient
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (searchKeyword) {
      countQuery = countQuery.ilike('title', `%${searchKeyword}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    totalPages = Math.ceil(count / POSTS_PER_PAGE) || 1;

    // 게시글 조회 (페이지네이션 적용)
    const from = (page - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    let query = supabaseClient
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchKeyword) {
      query = query.ilike('title', `%${searchKeyword}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    renderPosts(data, count);
    renderPagination();
  } catch (error) {
    console.error('게시글 로딩 실패:', error.message);
  }
}

// 게시글 목록 렌더링
function renderPosts(posts, totalCount = 0) {
  const tbody = document.getElementById('board-tbody');

  if (posts.length === 0) {
    const message = currentSearchKeyword
      ? `"${currentSearchKeyword}" 검색 결과가 없습니다.`
      : '게시글이 없습니다.';
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${message}</td></tr>`;
    return;
  }

  // 전체 게시글 수 기준으로 번호 계산
  const startNum = totalCount - (currentPage - 1) * POSTS_PER_PAGE;

  tbody.innerHTML = posts.map((post, index) => `
    <tr>
      <td>${startNum - index}</td>
      <td><a href="#" onclick="viewPost(${post.id}); return false;">${post.title}</a></td>
      <td>${post.author_nickname || ''}</td>
      <td>${post.author_id ? post.author_id.substring(0, 8) : ''}</td>
      <td>${formatDate(post.created_at)}</td>
      <td>${post.views || 0}</td>
    </tr>
  `).join('');
}

// ===== 페이지네이션 렌더링 =====
function renderPagination() {
  const pageInfo = document.querySelector('.page-info');
  const prevBtn = document.querySelector('.pagination .prev');
  const nextBtn = document.querySelector('.pagination .next');

  pageInfo.textContent = `${currentPage} page / ${totalPages} pages`;

  // 이전 버튼 활성화/비활성화
  if (currentPage <= 1) {
    prevBtn.style.opacity = '0.5';
    prevBtn.style.pointerEvents = 'none';
  } else {
    prevBtn.style.opacity = '1';
    prevBtn.style.pointerEvents = 'auto';
  }

  // 다음 버튼 활성화/비활성화
  if (currentPage >= totalPages) {
    nextBtn.style.opacity = '0.5';
    nextBtn.style.pointerEvents = 'none';
  } else {
    nextBtn.style.opacity = '1';
    nextBtn.style.pointerEvents = 'auto';
  }
}

// ===== 검색 기능 =====
function searchPosts() {
  const searchInput = document.getElementById('search-input');
  const keyword = searchInput.value.trim();
  loadPosts(1, keyword);
}

// ===== 페이지 이동 =====
function goToPrevPage() {
  if (currentPage > 1) {
    loadPosts(currentPage - 1, currentSearchKeyword);
  }
}

function goToNextPage() {
  if (currentPage < totalPages) {
    loadPosts(currentPage + 1, currentSearchKeyword);
  }
}

// ===== 게시글 상세 조회 =====
async function viewPost(postId, updateHash = true) {
  try {
    // 게시글 조회
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;

    // 조회수 직접 증가
    await supabaseClient
      .from('posts')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', postId);

    currentPostId = postId;
    renderPostDetail(data);
    loadComments(postId);
    showSection(detailSection, updateHash);
  } catch (error) {
    console.error('게시글 조회 실패:', error.message);
    alert('게시글을 불러올 수 없습니다.');
  }
}

// 게시글 상세 렌더링
async function renderPostDetail(post) {
  const user = await getCurrentUser();
  const isAuthor = user && user.id === post.author_id;

  // 제목
  detailSection.querySelector('.post-title').textContent = post.title;

  // 메타 정보
  detailSection.querySelector('.post-author').textContent = `작성자: ${post.author_nickname || '익명'}`;
  detailSection.querySelector('.post-date').textContent = `작성일: ${formatDate(post.created_at)}`;
  detailSection.querySelector('.post-views').textContent = `조회수: ${(post.views || 0) + 1}`;

  // 내용
  const contentEl = detailSection.querySelector('.post-content');
  contentEl.innerHTML = `<p>${post.content.replace(/\n/g, '<br>')}</p>`;

  // 이미지
  if (post.image_url) {
    contentEl.innerHTML += `<div class="post-image"><img src="${post.image_url}" alt="게시글 이미지"></div>`;
  }

  // 수정/삭제 버튼 (본인 글만 표시)
  const editBtn = detailSection.querySelector('.btn-edit');
  const deleteBtn = detailSection.querySelector('.btn-delete');

  if (isAuthor) {
    editBtn.style.display = 'inline-block';
    deleteBtn.style.display = 'inline-block';
  } else {
    editBtn.style.display = 'none';
    deleteBtn.style.display = 'none';
  }
}

// ===== 글쓰기 화면 표시 =====
async function showWriteForm(updateHash = true) {
  const user = await getCurrentUser();

  if (!user) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  isEditMode = false;
  currentPostId = null;
  currentImageUrl = null;

  // 폼 초기화
  document.getElementById('post-form').reset();
  document.getElementById('image-preview').innerHTML = '';
  document.getElementById('delete-image-btn').style.display = 'none';
  writeSection.querySelector('.page-title').textContent = '글쓰기';

  showSection(writeSection, updateHash);
}

// ===== 수정 화면 표시 =====
async function showEditForm(updateHash = true) {
  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('id', currentPostId)
      .single();

    if (error) throw error;

    isEditMode = true;
    currentImageUrl = data.image_url;

    // 폼에 데이터 채우기
    document.getElementById('post-form').reset();
    document.getElementById('post-title').value = data.title;
    document.getElementById('post-content').value = data.content;
    writeSection.querySelector('.page-title').textContent = '글 수정';

    // 기존 이미지 미리보기 및 삭제 버튼
    const preview = document.getElementById('image-preview');
    const deleteImageBtn = document.getElementById('delete-image-btn');

    if (data.image_url) {
      preview.innerHTML = `<img src="${data.image_url}" alt="미리보기" style="max-width: 200px;">`;
      deleteImageBtn.style.display = 'inline-block';
    } else {
      preview.innerHTML = '';
      deleteImageBtn.style.display = 'none';
    }

    showSection(writeSection, updateHash);
  } catch (error) {
    console.error('게시글 로딩 실패:', error.message);
  }
}

// ===== 수정 시 이미지 삭제 =====
async function deleteCurrentImage() {
  if (!currentImageUrl) return;

  if (!confirm('이미지를 삭제하시겠습니까?')) return;

  try {
    // Storage에서 이미지 삭제
    await deleteImageFromStorage(currentImageUrl);

    // DB에서 이미지 URL 제거
    const { error } = await supabaseClient
      .from('posts')
      .update({ image_url: null })
      .eq('id', currentPostId);

    if (error) throw error;

    // UI 업데이트
    currentImageUrl = null;
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('delete-image-btn').style.display = 'none';

    alert('이미지가 삭제되었습니다.');
  } catch (error) {
    console.error('이미지 삭제 실패:', error.message);
    alert('이미지 삭제에 실패했습니다.');
  }
}

// ===== 게시글 작성/수정 =====
async function savePost(e) {
  e.preventDefault();

  const user = await getCurrentUser();
  if (!user) {
    alert('로그인이 필요합니다.');
    return;
  }

  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const imageFile = document.getElementById('post-image').files[0];

  if (!title || !content) {
    alert('제목과 내용을 입력해주세요.');
    return;
  }

  try {
    let imageUrl = null;

    // 이미지 업로드
    if (imageFile) {
      const fileName = `${user.id}/${Date.now()}_${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient
        .storage
        .from('post-images')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // 이미지 URL 가져오기
      const { data: urlData } = supabaseClient
        .storage
        .from('post-images')
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    if (isEditMode) {
      // 수정
      const updateData = { title, content };
      if (imageUrl) updateData.image_url = imageUrl;

      const { error } = await supabaseClient
        .from('posts')
        .update(updateData)
        .eq('id', currentPostId);

      if (error) throw error;
      alert('게시글이 수정되었습니다.');
    } else {
      // 새 글 작성
      const nickname = getUserNickname(user);

      const { error } = await supabaseClient
        .from('posts')
        .insert({
          title,
          content,
          author_id: user.id,
          author_nickname: nickname,
          image_url: imageUrl
        });

      if (error) throw error;
      alert('게시글이 등록되었습니다.');
    }

    // 목록으로 이동
    showSection(boardSection);
    loadPosts();
  } catch (error) {
    console.error('저장 실패:', error.message);
    alert('저장에 실패했습니다: ' + error.message);
  }
}

// ===== 게시글 삭제 =====
async function deletePost() {
  if (!confirm('정말 삭제하시겠습니까?')) return;

  try {
    // 먼저 게시글 정보 조회 (이미지 URL 확인)
    const { data: post, error: fetchError } = await supabaseClient
      .from('posts')
      .select('image_url')
      .eq('id', currentPostId)
      .single();

    if (fetchError) throw fetchError;

    // Storage에서 이미지 삭제
    if (post.image_url) {
      await deleteImageFromStorage(post.image_url);
    }

    // 게시글 삭제
    const { error } = await supabaseClient
      .from('posts')
      .delete()
      .eq('id', currentPostId);

    if (error) throw error;

    alert('게시글이 삭제되었습니다.');
    showSection(boardSection);
    loadPosts();
  } catch (error) {
    console.error('삭제 실패:', error.message);
    alert('삭제에 실패했습니다.');
  }
}

// ===== 이미지 미리보기 =====
function previewImage(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('image-preview');

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="미리보기" style="max-width: 200px;">`;
    };
    reader.readAsDataURL(file);
  } else {
    preview.innerHTML = '';
  }
}

// ===== 댓글 목록 조회 =====
async function loadComments(postId) {
  try {
    const { data, error } = await supabaseClient
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    renderComments(data);
  } catch (error) {
    console.error('댓글 로딩 실패:', error.message);
  }
}

// 댓글 목록 렌더링
async function renderComments(comments) {
  const commentList = document.getElementById('comment-list');
  const user = await getCurrentUser();

  if (comments.length === 0) {
    commentList.innerHTML = '<li class="no-comments">댓글이 없습니다.</li>';
    return;
  }

  commentList.innerHTML = comments.map(comment => {
    const isAuthor = user && user.id === comment.author_id;
    const deleteBtn = isAuthor
      ? `<button type="button" class="btn-comment-delete" onclick="deleteComment(${comment.id})">삭제</button>`
      : '';

    return `
      <li class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${comment.author_nickname || '익명'}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <p class="comment-content">${comment.content.replace(/\n/g, '<br>')}</p>
        ${deleteBtn}
      </li>
    `;
  }).join('');
}

// ===== 댓글 작성 =====
async function submitComment(e) {
  e.preventDefault();

  const user = await getCurrentUser();
  if (!user) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  const content = document.getElementById('comment-content').value.trim();

  if (!content) {
    alert('댓글 내용을 입력해주세요.');
    return;
  }

  try {
    const nickname = getUserNickname(user);

    const { error } = await supabaseClient
      .from('comments')
      .insert({
        post_id: currentPostId,
        content,
        author_id: user.id,
        author_nickname: nickname
      });

    if (error) throw error;

    // 입력창 초기화 및 댓글 목록 새로고침
    document.getElementById('comment-content').value = '';
    loadComments(currentPostId);
  } catch (error) {
    console.error('댓글 작성 실패:', error.message);
    alert('댓글 작성에 실패했습니다.');
  }
}

// ===== 댓글 삭제 =====
async function deleteComment(commentId) {
  if (!confirm('댓글을 삭제하시겠습니까?')) return;

  try {
    const { error } = await supabaseClient
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    loadComments(currentPostId);
  } catch (error) {
    console.error('댓글 삭제 실패:', error.message);
    alert('댓글 삭제에 실패했습니다.');
  }
}

// ===== 이벤트 리스너 등록 =====
document.addEventListener('DOMContentLoaded', () => {
  // 브라우저 뒤로가기/앞으로가기 처리
  window.addEventListener('popstate', handleHashChange);

  // 초기 해시 확인 및 화면 표시
  if (window.location.hash) {
    handleHashChange();
  } else {
    // 게시글 목록 로드
    loadPosts();
  }

  // 검색 버튼
  document.getElementById('search-btn').addEventListener('click', searchPosts);

  // 검색 입력창 Enter 키
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchPosts();
    }
  });

  // 페이지네이션 버튼
  document.querySelector('.pagination .prev').addEventListener('click', (e) => {
    e.preventDefault();
    goToPrevPage();
  });

  document.querySelector('.pagination .next').addEventListener('click', (e) => {
    e.preventDefault();
    goToNextPage();
  });

  // 글쓰기 버튼
  document.getElementById('write-btn').addEventListener('click', showWriteForm);

  // 취소 버튼
  document.getElementById('cancel-btn').addEventListener('click', () => {
    showSection(boardSection);
  });

  // 글 등록/수정 폼 제출
  document.getElementById('post-form').addEventListener('submit', savePost);

  // 이미지 미리보기
  document.getElementById('post-image').addEventListener('change', previewImage);

  // 목록 버튼
  detailSection.querySelector('.btn-list').addEventListener('click', () => {
    showSection(boardSection);
    loadPosts(currentPage, currentSearchKeyword);
  });

  // 수정 버튼
  detailSection.querySelector('.btn-edit').addEventListener('click', showEditForm);

  // 삭제 버튼
  detailSection.querySelector('.btn-delete').addEventListener('click', deletePost);

  // 이미지 삭제 버튼
  document.getElementById('delete-image-btn').addEventListener('click', deleteCurrentImage);

  // 댓글 폼 제출
  document.getElementById('comment-form').addEventListener('submit', submitComment);
});
