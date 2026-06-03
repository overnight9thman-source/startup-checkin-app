const STORAGE_KEY = "startup-checkin-records-v1";

const form = document.querySelector("#checkinForm");
const todayDateEl = document.querySelector("#todayDate");
const scoreValueEl = document.querySelector("#scoreValue");
const statusBadgeEl = document.querySelector("#statusBadge");
const historyListEl = document.querySelector("#historyList");
const clearButton = document.querySelector("#clearButton");
const saveMessageEl = document.querySelector("#saveMessage");

const fieldLabels = {
  postedContent: "发布内容",
  addedAsset: "业务资产",
  developedClient: "开发客户",
  shortVideoTime: "短视频",
  exercised: "运动",
  visibleResult: "可见成果"
};

const shortVideoLabels = {
  under30: "少于30分钟",
  "30to60": "30-60分钟",
  over60: "超过60分钟"
};

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function readRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getFormData() {
  const data = new FormData(form);
  return {
    postedContent: data.get("postedContent"),
    addedAsset: data.get("addedAsset"),
    developedClient: data.get("developedClient"),
    shortVideoTime: data.get("shortVideoTime"),
    exercised: data.get("exercised"),
    visibleResult: data.get("visibleResult")
  };
}

function setFormData(record) {
  Object.entries(record).forEach(([name, value]) => {
    if (name === "score" || name === "status" || name === "savedAt") return;
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  });
}

function calculateScore(record) {
  let score = 0;
  if (record.postedContent === "yes") score += 1;
  if (record.addedAsset === "yes") score += 1;
  if (record.developedClient === "yes") score += 1;
  if (record.shortVideoTime === "under30") score += 1;
  if (record.shortVideoTime === "over60") score -= 1;
  if (record.exercised === "yes") score += 1;
  if (record.visibleResult === "yes") score += 2;
  return score;
}

function getStatus(score) {
  if (score <= 1) return { text: "危险状态", className: "status-danger" };
  if (score <= 3) return { text: "维持状态", className: "status-maintain" };
  if (score <= 5) return { text: "优秀", className: "status-good" };
  return { text: "非常好", className: "status-great" };
}

function updateScorePanel(record) {
  const score = calculateScore(record);
  const status = getStatus(score);
  scoreValueEl.textContent = score;
  statusBadgeEl.textContent = status.text;
  statusBadgeEl.className = `status-badge ${status.className}`;
}

function yesNoText(value) {
  return value === "yes" ? "是" : "否";
}

function renderHistory() {
  const records = readRecords();
  const items = Object.entries(records)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .slice(0, 7);

  if (items.length === 0) {
    historyListEl.innerHTML = '<div class="empty-history">还没有打卡记录</div>';
    return;
  }

  historyListEl.innerHTML = items.map(([date, record]) => {
    const score = calculateScore(record);
    const status = getStatus(score);
    const detail = [
      `${fieldLabels.postedContent}:${yesNoText(record.postedContent)}`,
      `${fieldLabels.addedAsset}:${yesNoText(record.addedAsset)}`,
      `${fieldLabels.developedClient}:${yesNoText(record.developedClient)}`,
      `${fieldLabels.shortVideoTime}:${shortVideoLabels[record.shortVideoTime]}`,
      `${fieldLabels.exercised}:${yesNoText(record.exercised)}`,
      `${fieldLabels.visibleResult}:${yesNoText(record.visibleResult)}`
    ].join(" / ");

    return `
      <article class="history-item">
        <div class="history-date">${formatDisplayDate(date)}</div>
        <div class="history-score">${score}分 · ${status.text}</div>
        <div class="history-detail">${detail}</div>
      </article>
    `;
  }).join("");
}

function saveToday() {
  const todayKey = getTodayKey();
  const record = getFormData();
  record.score = calculateScore(record);
  record.status = getStatus(record.score).text;
  record.savedAt = new Date().toISOString();

  const records = readRecords();
  records[todayKey] = record;
  writeRecords(records);

  updateScorePanel(record);
  renderHistory();
  saveMessageEl.textContent = "已保存今天打卡。再次保存会覆盖今天记录。";
}

function loadToday() {
  const todayKey = getTodayKey();
  todayDateEl.textContent = `今天：${formatDisplayDate(todayKey)}`;

  const records = readRecords();
  if (records[todayKey]) {
    setFormData(records[todayKey]);
  }

  updateScorePanel(getFormData());
  renderHistory();
}

form.addEventListener("change", () => {
  updateScorePanel(getFormData());
  saveMessageEl.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveToday();
});

clearButton.addEventListener("click", () => {
  const confirmed = window.confirm("确定要清空所有打卡记录吗？此操作不能撤销。");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  saveMessageEl.textContent = "所有记录已清空。";
  renderHistory();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

loadToday();
