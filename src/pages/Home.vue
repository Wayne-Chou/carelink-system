<template>
  <div class="home">
    <div class="bg-blur b1"></div>
    <div class="bg-blur b2"></div>

    <div class="hero-wrapper">
      <div class="hero-inner">
        <div class="hero-tag">COMMUNITY CARE</div>
        <h1>社區資源連結平台</h1>
        <p>讓社區支持更容易被找到，建立更有溫度的照護網絡</p>
      </div>
    </div>

    <div class="main-container container">
      <div class="glass-panel">
        <div class="header-content">
          <h3>請選擇您的角色</h3>
          <p>依據身分進入專屬操作流程</p>
        </div>

        <div class="row justify-content-center g-4">
          <div class="col-md-4">
            <div class="card-item" @click="goForm">
              <div class="card-icon">
                <span class="emoji">📝</span>
              </div>
              <div class="card-body">
                <h5>訪查員端</h5>
                <span class="card-desc">建立與紀錄社區資源資料</span>
              </div>
              <div class="card-footer">
                <span>立即登錄</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="card-item" @click="goList">
              <div class="card-icon">
                <span class="emoji">🛠️</span>
              </div>
              <div class="card-body">
                <h5>管理後台</h5>
                <span class="card-desc">審核資料與系統權限管理</span>
              </div>
              <div class="card-footer">
                <span>進入管理</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="card-item" @click="goUser">
              <div class="card-icon">
                <span class="emoji">👥</span>
              </div>
              <div class="card-body">
                <h5>一般使用者</h5>
                <span class="card-desc">查詢與參與社區各項活動</span>
              </div>
              <div class="card-footer">
                <span>開始查詢</span>
                <span class="arrow">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goForm = () => router.push("/form");
const goList = () => router.push("/list");
const goUser = () => router.push("/user"); // 這裡假設使用者的路徑為 /user
</script>

<style scoped>
/* ===== 配色核心定義 ===== */
.home {
  position: relative;
  min-height: 100vh;
  background-color: #fcfaf8;
  overflow-x: hidden;
  font-family: "PingFang TC", "Microsoft JhengHei", sans-serif;
}

/* ===== 背景柔光球 ===== */
.bg-blur {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  z-index: 0;
  opacity: 0.4;
}
.b1 {
  width: 450px;
  height: 450px;
  background: #e3d5ca;
  top: -10%;
  left: -5%;
}
.b2 {
  width: 400px;
  height: 400px;
  background: #d6ccc2;
  bottom: -5%;
  right: -5%;
}

/* ===== Hero Section (深咖啡色調) ===== */
.hero-wrapper {
  height: 320px;
  background: linear-gradient(135deg, #5d4037 0%, #8d6e63 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;
  padding-bottom: 60px;
}
.hero-tag {
  font-size: 11px;
  letter-spacing: 2px;
  background: rgba(255, 255, 255, 0.15);
  display: inline-block;
  padding: 3px 12px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-weight: 600;
}
.hero-inner h1 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: 1px;
}
.hero-inner p {
  font-size: 16px;
  opacity: 0.9;
  font-weight: 300;
}

/* ===== 主面板 (毛玻璃效果) ===== */
.main-container {
  margin-top: -80px;
  position: relative;
  z-index: 10;
  padding-bottom: 80px;
}
.glass-panel {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 50px 30px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 20px 50px rgba(93, 64, 55, 0.08);
}

.header-content {
  text-align: center;
  margin-bottom: 40px;
}
.header-content h3 {
  color: #3e2723;
  font-weight: 700;
  font-size: 24px;
}
.header-content p {
  color: #8d6e63;
  font-size: 14px;
}

/* ===== 卡片設計 (大地色系) ===== */
.card-item {
  background: #ffffff;
  border-radius: 20px;
  padding: 35px 25px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  border: 1px solid #f0e6e0;
  cursor: pointer;
  text-decoration: none;
}

.card-icon {
  width: 65px;
  height: 65px;
  background: #fdf8f5;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 20px;
  transition: 0.3s;
}

.card-body h5 {
  font-size: 20px;
  font-weight: 700;
  color: #3e2723;
  margin-bottom: 8px;
}
.card-desc {
  font-size: 14px;
  color: #8d6e63;
  line-height: 1.6;
  display: block;
  margin-bottom: 20px;
}

.card-footer {
  margin-top: auto;
  padding-top: 15px;
  border-top: 1px solid #f5f0ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #a1887f;
  font-weight: 600;
  font-size: 14px;
}

.arrow {
  transition: transform 0.3s ease;
}

/* ===== 互動效果 ===== */
.card-item:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 35px rgba(93, 64, 55, 0.12);
  border-color: #d7ccc8;
}

.card-item:hover .card-icon {
  background: #5d4037;
  transform: rotate(5deg);
}

.card-item:hover .card-footer {
  color: #5d4037;
}

.card-item:hover .arrow {
  transform: translateX(5px);
}

/* RWD 響應式 */
@media (max-width: 768px) {
  .hero-inner h1 {
    font-size: 26px;
  }
  .main-container {
    margin-top: -40px;
  }
  .glass-panel {
    padding: 30px 15px;
  }
}
</style>