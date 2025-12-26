// CatHome 메인 스크립트

// ===== 메인 슬라이드 =====
document.addEventListener('DOMContentLoaded', () => {
  const swiper = document.querySelector('.swiper');
  if (!swiper) return;

  const wrapper = swiper.querySelector('.swiper-wrapper');
  const slides = swiper.querySelectorAll('.swiper-slide');
  const prevBtn = swiper.querySelector('.swiper-button-prev');
  const nextBtn = swiper.querySelector('.swiper-button-next');
  const pagination = swiper.querySelector('.swiper-pagination');

  let currentIndex = 0;
  const totalSlides = slides.length;
  let autoSlideInterval;

  // 페이지네이션 생성
  function createPagination() {
    if (!pagination) return;

    pagination.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('span');
      dot.classList.add('swiper-dot');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      pagination.appendChild(dot);
    }
  }

  // 슬라이드 이동
  function goToSlide(index) {
    if (index < 0) {
      currentIndex = totalSlides - 1;
    } else if (index >= totalSlides) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    wrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
    updatePagination();
  }

  // 페이지네이션 업데이트
  function updatePagination() {
    if (!pagination) return;

    const dots = pagination.querySelectorAll('.swiper-dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentIndex);
    });
  }

  // 이전 슬라이드
  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // 다음 슬라이드
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  // 자동 슬라이드
  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 4000);
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }

  // 이벤트 리스너
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // 마우스 호버 시 자동 슬라이드 정지
  swiper.addEventListener('mouseenter', stopAutoSlide);
  swiper.addEventListener('mouseleave', startAutoSlide);

  // 터치 스와이프 지원
  let touchStartX = 0;
  let touchEndX = 0;

  swiper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoSlide();
  });

  swiper.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoSlide();
  });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (diff > swipeThreshold) {
      nextSlide();
    } else if (diff < -swipeThreshold) {
      prevSlide();
    }
  }

  // 초기화
  createPagination();
  wrapper.style.transition = 'transform 0.5s ease-in-out';
  startAutoSlide();
});
