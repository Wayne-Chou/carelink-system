<template>
  <div class="home">
    <div class="bg-blur b1"></div>
    <div class="bg-blur b2"></div>

    <div
      class="hero-wrapper"
      :style="{ backgroundImage: `url(${heroBg})` }"
    >
      <div class="hero-inner">
        <img :src="logo" class="hero-logo" />
 
        <h1>社區資源連結平台</h1>
        <p>讓社區支持更容易被找到，建立更有溫度的照護網絡</p>
      </div>
    </div>

    <div class="main-container container">
      <div class="glass-panel">
        <div class="panel-header">
          <h3>請選擇您的角色</h3>
          <p>依據身分進入專屬操作流程</p>
        </div>

        <div class="card-group">
          <div>
            <div class="card-item" @click="goForm">
              <div class="card-icon">
                <i class="fa-solid fa-clipboard-list"></i>
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

          <div>
            <div class="card-item" @click="goList">
              <div class="card-icon">
                <i class="fa-solid fa-shield-halved"></i>
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

          <div>
            <div class="card-item" @click="goUser">
              <div class="card-icon">
                <i class="fa-solid fa-users"></i>
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
import heroBg from "../assets/bg-community-brown.png";
import logo from "../assets/logo.png";
import { useRouter } from "vue-router";

const router = useRouter();

const goForm = () => router.push("/form");
const goList = () => router.push("/list");
const goUser = () => router.push("/user"); 

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
.hero-logo {
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 12px;

  
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
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


.hero-wrapper {
  min-height: 42vh;

  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: white;

  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;

  position: relative;
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
  background: #f5efe6;
  border-radius: 30px;
  padding: 60px 40px;
  box-shadow: 0 18px 42px rgba(93, 64, 55, 0.12);
}

.panel-header {
  text-align: center;
  margin-bottom: 34px;
}
.panel-header h3 {
  color: #4e342e;
  font-weight: 800;
  font-size: 30px;
  margin-bottom: 8px;
}
.panel-header p {
  color: #a1887f;
  font-size: 15px;
}

.card-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

/* ===== 卡片設計 (大地色系) ===== */
.card-item {
  background: #f8f4f0;
  border-radius: 24px;
  padding: 36px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
  border: none;
  cursor: pointer;
  text-decoration: none;
  box-shadow: 0 10px 28px rgba(93, 64, 55, 0.1);
}

.card-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 22px;
  transition: 0.3s;
  color: white;
}

.card-group > div:nth-child(1) .card-icon {
  background: #c79a6d;
}

.card-group > div:nth-child(2) .card-icon {
  background: #8f9d85;
}

.card-group > div:nth-child(3) .card-icon {
  background: #d68552;
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
  padding: 10px 16px;
  border-top: none;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  background: #c79a6d;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}

.arrow {
  transition: transform 0.3s ease;
}

/* ===== 互動效果 ===== */
.card-item:hover {
  transform: translateY(-7px);
  box-shadow: 0 16px 34px rgba(93, 64, 55, 0.16);
}

.card-item:hover .card-icon {
  transform: scale(1.03);
}

.card-item:hover .card-footer {
  background: #b98158;
  color: #ffffff;
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