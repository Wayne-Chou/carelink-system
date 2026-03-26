<template>
  <div class="success-page">
    <div class="success-card">
      <div class="check-icon">✓</div>
      <h2>提交成功！</h2>
      <p>感謝您的辛勞，該筆資源已進入審核隊列。</p>

      <div class="action-buttons">
        <button class="btn-again" @click="$router.push('/form')">
          再新增一筆
        </button>
        <button class="btn-home" @click="$router.push('/')">回到首頁</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fcfaf8;
  padding: 20px;
}
.success-card {
  background: white;
  padding: 40px;
  border-radius: 30px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(93, 64, 55, 0.1);
  max-width: 400px;
  width: 100%;
}
.check-icon {
  width: 80px;
  height: 80px;
  background: #2e7d32;
  color: white;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 auto 20px;
}
h2 {
  color: #3e2723;
  font-weight: 700;
  margin-bottom: 10px;
}
p {
  color: #8d6e63;
  margin-bottom: 30px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
button {
  padding: 15px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.btn-again {
  background: #5d4037;
  color: white;
}
.btn-home {
  background: #efe7dc;
  color: #5d4037;
}
</style>