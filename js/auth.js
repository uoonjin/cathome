// 인증 관련 기능

// 회원가입
async function signUp(email, password, nickname) {
  try {
    // 1. Supabase Auth로 회원가입
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          nickname: nickname
        }
      }
    });

    if (error) throw error;

    return { success: true, message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 로그인
async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    return { success: true, message: '로그인 성공!', user: data.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 로그아웃
async function signOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;

    return { success: true, message: '로그아웃 되었습니다.' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 현재 로그인한 사용자 정보 가져오기
async function getCurrentUser() {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  } catch (error) {
    return null;
  }
}

// 사용자 닉네임 가져오기
function getUserNickname(user) {
  if (!user) return null;
  return user.user_metadata?.nickname || user.email.split('@')[0];
}

// 헤더 UI 업데이트 (로그인 상태에 따라)
async function updateHeaderUI() {
  const user = await getCurrentUser();
  const topMenu = document.querySelector('.top-menu');

  if (!topMenu) return;

  if (user) {
    // 로그인 상태
    const nickname = getUserNickname(user);
    topMenu.innerHTML = `
      <span class="user-info">${nickname}님</span>
      <a href="#" id="btn-logout">로그아웃</a>
      <a href="#">장바구니</a>
      <a href="#">마이페이지</a>
    `;

    // 로그아웃 버튼 이벤트
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const result = await signOut();
        if (result.success) {
          alert(result.message);
          window.location.reload();
        }
      });
    }
  } else {
    // 비로그인 상태
    topMenu.innerHTML = `
      <a href="login.html">로그인</a>
      <a href="#">장바구니</a>
      <a href="#">마이페이지</a>
    `;
  }
}

// 페이지 로드 시 헤더 UI 업데이트
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderUI();
});
