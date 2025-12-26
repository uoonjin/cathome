// 게시판 CRUD 기능

// 현재 보고 있는 게시글 ID
let currentPostId = null;
// 수정 모드 여부
let isEditMode = false;

// 섹션 요소
const boardSection = document.getElementById('board-section');
const writeSection = document.getElementById('write-section');
const detailSection = document.getElementById('detail-section');

// ===== 화면 전환 함수 =====
function showSection(section) {
  boardSection.style.display = 'none';
  writeSection.style.display = 'none';
  detailSection.style.display = 'none';
  section.style.display = 'block';
}

// ===== 날짜 포맷 함수 =====
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===== 게시글 목록 조회 =====
async function loadPosts() {
  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderPosts(data);
  } catch (error) {
    console.error('게시글 로딩 실패:', error.message);
  }
}

// 게시글 목록 렌더링
function renderPosts(posts) {
  const tbody = document.getElementById('board-tbody');

  if (posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">게시글이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = posts.map((post, index) => `
    <tr>
      <td>${posts.length - index}</td>
      <td><a href="#" onclick="viewPost(${post.id}); return false;">${post.title}</a></td>
      <td>${post.author_nickname || ''}</td>
      <td>${post.author_id ? post.author_id.substring(0, 8) : ''}</td>
      <td>${formatDate(post.created_at)}</td>
      <td>${post.views || 0}</td>
    </tr>
  `).join('');
}

// ===== 게시글 상세 조회 =====
async function viewPost(postId) {
  try {
    // 조회수 증가
    await supabaseClient
      .from('posts')
      .update({ views: supabaseClient.rpc('increment_views', { row_id: postId }) })
      .eq('id', postId);

    // 게시글 조회
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;

    // 조회수 직접 증가 (RPC 없이)
    await supabaseClient
      .from('posts')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', postId);

    currentPostId = postId;
    renderPostDetail(data);
    showSection(detailSection);
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
async function showWriteForm() {
  const user = await getCurrentUser();

  if (!user) {
    alert('로그인이 필요합니다.');
    window.location.href = 'login.html';
    return;
  }

  isEditMode = false;
  currentPostId = null;

  // 폼 초기화
  document.getElementById('post-form').reset();
  document.getElementById('image-preview').innerHTML = '';
  writeSection.querySelector('.page-title').textContent = '글쓰기';

  showSection(writeSection);
}

// ===== 수정 화면 표시 =====
async function showEditForm() {
  try {
    const { data, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('id', currentPostId)
      .single();

    if (error) throw error;

    isEditMode = true;

    // 폼에 데이터 채우기
    document.getElementById('post-title').value = data.title;
    document.getElementById('post-content').value = data.content;
    writeSection.querySelector('.page-title').textContent = '글 수정';

    // 기존 이미지 미리보기
    const preview = document.getElementById('image-preview');
    if (data.image_url) {
      preview.innerHTML = `<img src="${data.image_url}" alt="미리보기" style="max-width: 200px;">`;
    } else {
      preview.innerHTML = '';
    }

    showSection(writeSection);
  } catch (error) {
    console.error('게시글 로딩 실패:', error.message);
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

// ===== 이벤트 리스너 등록 =====
document.addEventListener('DOMContentLoaded', () => {
  // 게시글 목록 로드
  loadPosts();

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
    loadPosts();
  });

  // 수정 버튼
  detailSection.querySelector('.btn-edit').addEventListener('click', showEditForm);

  // 삭제 버튼
  detailSection.querySelector('.btn-delete').addEventListener('click', deletePost);
});
