const defaultPortraitUrl = "assets/ruan-han-cutout.png";
const photoStorageKey = "ruan-han-portfolio-portrait";
const maxPhotoBytes = 5 * 1024 * 1024;

document.querySelector("#year").textContent = new Date().getFullYear();

/* === 菜单 === */
const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".site-nav");
const closeMenu = () => { menuButton.setAttribute("aria-expanded", "false"); navigation.classList.remove("is-open"); document.body.classList.remove("menu-open"); };
menuButton.addEventListener("click", () => { const isOpen = menuButton.getAttribute("aria-expanded") === "true"; menuButton.setAttribute("aria-expanded", String(!isOpen)); navigation.classList.toggle("is-open", !isOpen); document.body.classList.toggle("menu-open", !isOpen); });
navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

/* === 滚动揭示（含逐行揭示） === */
const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); } }), { threshold: 0.12 });
document.querySelectorAll(".reveal, .line-reveal").forEach((element) => { element.style.setProperty("--delay", `${element.dataset.delay || 0}ms`); revealObserver.observe(element); });

/* === 导航当前区块高亮 === */
const navLinks = [...navigation.querySelectorAll("a")];
const sectionObserver = new IntersectionObserver((entries) => { const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (active) navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${active.target.id}`)); }, { rootMargin: "-35% 0px -55%", threshold: [0, 0.25, 0.5] });
navLinks.map((link) => document.querySelector(link.hash)).filter(Boolean).forEach((section) => sectionObserver.observe(section));

/* === 自定义光标 === */
const cursor = document.querySelector(".cursor");
if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`; });
  (function ringLoop() { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`; requestAnimationFrame(ringLoop); })();
  document.querySelectorAll("a, button, .portrait-card__image, [data-project]").forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });
  window.addEventListener("mousedown", () => cursor.classList.add("is-down"));
  window.addEventListener("mouseup", () => cursor.classList.remove("is-down"));
}

/* === 磁性按钮 === */
document.querySelectorAll(".magnetic").forEach((el) => {
  const strength = 0.3;
  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  });
  el.addEventListener("mouseleave", () => { el.style.transform = "translate(0,0)"; });
});

/* === 导航栏随滚动自动隐藏/显示 === */
const siteHeader = document.querySelector(".site-header");
let lastY = 0;
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  if (y > lastY && y > 240) siteHeader.classList.add("is-hidden");
  else siteHeader.classList.remove("is-hidden");
  lastY = y;
}, { passive: true });

/* === 数字计数动画 === */
const countObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) {
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10) || 0;
    const dur = 1300;
    const startT = performance.now();
    el.textContent = 0;
    (function tick(now) {
      const p = Math.min((now - startT) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    })(startT);
    countObserver.unobserve(el);
  }
}), { threshold: 0.5 });
document.querySelectorAll(".count").forEach((el) => countObserver.observe(el));

/* === 灵动性：鼠标视差、轨迹跟随 === */
const heroSection = document.querySelector(".hero");
const portraitCard = document.querySelector(".portrait-card");
const portraitImg = document.querySelector(".portrait-card__image");
const heroCopy = document.querySelector(".hero__copy");
const heroSticker = document.querySelector(".hero-sticker");
const ambientOrbs = [...document.querySelectorAll(".ambient__orb")];
const sparks = [...document.querySelectorAll(".spark")];
let pointerX = 0.5;
let pointerY = 0.5;
let currentX = 0.5;
let currentY = 0.5;
let rafId = null;

function onPointerMove(event) {
  const rect = heroSection?.getBoundingClientRect();
  if (!rect || rect.width === 0) return;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  pointerX = Math.max(0, Math.min(1, x));
  pointerY = Math.max(0, Math.min(1, y));
  if (!rafId) tickParallax();
}
function tickParallax() {
  currentX += (pointerX - currentX) * 0.08;
  currentY += (pointerY - currentY) * 0.08;
  const dx = (currentX - 0.5) * 2;
  const dy = (currentY - 0.5) * 2;
  if (portraitCard) {
    portraitCard.style.setProperty("--portrait-tx", `${dx * 18}px`);
    portraitCard.style.setProperty("--portrait-ty", `${dy * 14}px`);
    portraitCard.style.setProperty("--portrait-rotX", `${-dy * 4}deg`);
    portraitCard.style.setProperty("--portrait-rotY", `${dx * 6}deg`);
  }
  if (heroCopy) { heroCopy.style.transform = `translate(${dx * -8}px, ${dy * -6}px)`; }
  if (heroSticker) { heroSticker.style.transform = `rotate(${-5 + dx * 6}deg) translate(${dx * 10}px, ${dy * 8}px)`; }
  ambientOrbs.forEach((orb, index) => {
    const depth = [0.4, 0.55, 0.7][index] || 0.5;
    orb.style.transform = `translate(${dx * 60 * depth}px, ${dy * 45 * depth}px)`;
  });
  sparks.forEach((spark, index) => {
    const depth = index === 0 ? 1.4 : 1.0;
    spark.style.marginLeft = `${dx * -22 * depth}px`;
    spark.style.marginTop = `${dy * -16 * depth}px`;
  });
  if (Math.abs(pointerX - currentX) > 0.0005 || Math.abs(pointerY - currentY) > 0.0005) rafId = requestAnimationFrame(tickParallax);
  else rafId = null;
}
if (heroSection) {
  heroSection.addEventListener("mousemove", onPointerMove);
  heroSection.addEventListener("mouseleave", () => { pointerX = 0.5; pointerY = 0.5; if (!rafId) tickParallax(); });
}

/* 滚动视差 - 人像在 hero 内轻移 */
function onScrollParallax() {
  if (!heroSection) return;
  const rect = heroSection.getBoundingClientRect();
  const progress = Math.max(-0.2, Math.min(1, -rect.top / rect.height));
  if (portraitImg) portraitImg.style.setProperty("--portrait-scroll", `${progress * 22}px`);
  if (heroCopy) heroCopy.style.setProperty("--copy-scroll", `${progress * 32}px`);
}
window.addEventListener("scroll", onScrollParallax, { passive: true });

/* hero-sticker 轻微呼吸感 */
if (heroSticker) {
  let stickerT = 0;
  (function stickerBreath() {
    stickerT += 0.018;
    heroSticker.style.setProperty("--sticker-bob", `${Math.sin(stickerT) * 3}px`);
    heroSticker.style.setProperty("--sticker-rot", `${Math.sin(stickerT * 0.7) * 1.2}deg`);
    requestAnimationFrame(stickerBreath);
  })();
}

/* spark 随机飘动 */
sparks.forEach((spark) => {
  let sxT = Math.random() * Math.PI * 2;
  const sxSpeed = 0.6 + Math.random() * 0.5;
  (function animate() {
    sxT += 0.018 * sxSpeed;
    spark.style.setProperty("--spark-x", `${Math.sin(sxT) * 6}px`);
    spark.style.setProperty("--spark-y", `${Math.cos(sxT * 0.7) * 8}px`);
    spark.style.setProperty("--spark-r", `${Math.sin(sxT * 0.5) * 18}deg`);
    requestAnimationFrame(animate);
  })();
});

/* Hero h1 文字逐字入场 */
const heroTitle = document.querySelector(".hero h1");
if (heroTitle) {
  heroTitle.querySelectorAll("span").forEach((line) => {
    if (line.querySelector("em") || line.classList.contains("hero__serif") || line.classList.contains("hero__accent")) return;
    const text = line.textContent;
    line.textContent = "";
    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char;
      span.style.setProperty("--char-delay", `${index * 38}ms`);
      line.appendChild(span);
    });
  });
}

/* === 照片上传 / 拖拽替换 === */
const portraitInput = document.querySelector("#portrait-input");
const portraitImage = document.querySelector("#portrait-image");
const portraitRemove = document.querySelector("#portrait-remove");
const portraitHint = document.querySelector("#portrait-hint");
const photoDropzone = document.querySelector("#photo-dropzone");
function showPhoto(source, isCustom = false) { portraitImage.src = source; portraitRemove.disabled = !isCustom; portraitHint.textContent = isCustom ? "已保存到当前浏览器，可随时恢复默认" : "校园里的日常瞬间"; }
function restoreDefaultPhoto() { localStorage.removeItem(photoStorageKey); portraitInput.value = ""; showPhoto(defaultPortraitUrl); }
function loadPhoto(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) { portraitHint.textContent = "请选择 PNG、JPG 或 WebP 图片"; return; }
  if (file.size > maxPhotoBytes) { portraitHint.textContent = "照片请控制在 5MB 以内"; return; }
  const reader = new FileReader();
  reader.onload = () => { try { localStorage.setItem(photoStorageKey, reader.result); } catch {} showPhoto(reader.result, true); };
  reader.readAsDataURL(file);
}
try { const savedPhoto = localStorage.getItem(photoStorageKey); showPhoto(savedPhoto || defaultPortraitUrl, Boolean(savedPhoto)); } catch { showPhoto(defaultPortraitUrl); }
portraitInput.addEventListener("change", () => loadPhoto(portraitInput.files[0]));
portraitRemove.addEventListener("click", restoreDefaultPhoto);
portraitImage.addEventListener("click", () => portraitInput.click());
["dragenter", "dragover"].forEach((name) => photoDropzone.addEventListener(name, (event) => { event.preventDefault(); photoDropzone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((name) => photoDropzone.addEventListener(name, (event) => { event.preventDefault(); photoDropzone.classList.remove("is-dragging"); }));
photoDropzone.addEventListener("drop", (event) => loadPhoto(event.dataTransfer.files[0]));

/* === 项目详情弹窗 === */
const projectDialog = document.querySelector("#project-dialog");
const projectGithub = document.querySelector("#project-github");
document.querySelectorAll("[data-project]").forEach((button) => button.addEventListener("click", () => {
  const projectLink = button.dataset.projectLink?.trim();
  document.querySelector("#project-dialog-title").textContent = button.dataset.project;
  document.querySelector("#project-dialog-type").textContent = button.dataset.projectType;
  document.querySelector("#project-dialog-description").textContent = button.dataset.projectDescription;
  projectGithub.href = projectLink || "";
  projectGithub.textContent = projectLink ? "查看 GitHub 项目 ↗" : "GitHub 链接待添加";
  projectGithub.setAttribute("aria-disabled", String(!projectLink));
  projectDialog.showModal();
}));
document.querySelector(".project-dialog__close").addEventListener("click", () => projectDialog.close());
document.querySelector("#project-contact").addEventListener("click", () => projectDialog.close());
projectDialog.addEventListener("click", (event) => { if (event.target === projectDialog) projectDialog.close(); });

/* === 气泡按钮：悬停时气泡从光标位置展开并填充 === */
document.querySelectorAll(".button").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--bx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--by", `${e.clientY - rect.top}px`);
  });
  el.addEventListener("mouseleave", () => { el.style.setProperty("--by", "120%"); });
});

/* === about 区人像揭示：鼠标掠过从素面显露彩色 === */
const aboutReveal = document.querySelector("#about-reveal");
if (aboutReveal) {
  const setReveal = (x, y, r) => {
    aboutReveal.style.setProperty("--reveal-x", x + "%");
    aboutReveal.style.setProperty("--reveal-y", y + "%");
    aboutReveal.style.setProperty("--reveal-r", r + "px");
  };
  aboutReveal.addEventListener("mouseenter", (e) => {
    const rect = aboutReveal.getBoundingClientRect();
    setReveal(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100, 150);
  });
  aboutReveal.addEventListener("mousemove", (e) => {
    const rect = aboutReveal.getBoundingClientRect();
    setReveal(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100, 168);
  });
  aboutReveal.addEventListener("mouseleave", () => setReveal(50, 50, 0));
  aboutReveal.addEventListener("touchstart", (e) => {
    const rect = aboutReveal.getBoundingClientRect();
    const t = e.touches[0];
    setReveal(((t.clientX - rect.left) / rect.width) * 100, ((t.clientY - rect.top) / rect.height) * 100, 168);
  }, { passive: true });
  aboutReveal.addEventListener("touchend", () => setReveal(50, 50, 0), { passive: true });
}
