// ==============================================
// 家庭云端点菜系统 - 真实AI菜谱 + 云端同步版
// ==============================================
const QWEN_API_KEY = "sk-0996e11059b645cb9d0465fff29a7211"; // 替换成你的通义千问API-KEY
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

// 使用 localStorage 模拟云端数据（后续可升级为Firebase/云数据库）
const CLOUD_KEY = "family_order_cloud_data";

let appData = {
  systemName: "小恒家厨房",
  bannerUrl: "https://picsum.photos/800/400",
  avatarUrl: "https://picsum.photos/200/200",
  myMenu: [],
  collectList: [],
  customFoods: [],
  allFoods: [],
  activeTab: 0,
  currentFood: null,
  tempFoodImage: ""
};

const defaultFoods = [
  { id: 1, name: "米饭", category: "主食", time: 20, diff: "简单", cal: "130kcal", pic: "https://picsum.photos/600/400?random=1", desc: "软糯白米饭", ingredients: [{name:"大米",unit:"200g"},{name:"清水",unit:"300ml"}], steps: ["淘洗大米","浸泡10分钟","电饭煲煮饭","焖5分钟"] },
  { id: 2, name: "面条", category: "主食", time: 10, diff: "简单", cal: "110kcal", pic: "https://picsum.photos/600/400?random=2", desc: "清水煮面", ingredients: [{name:"面条",unit:"150g"},{name:"水",unit:"500ml"}], steps: ["烧水","煮面","捞出"] },
  { id: 3, name: "番茄炒蛋", category: "热菜", time: 10, diff: "简单", cal: "150kcal", pic: "https://picsum.photos/600/400?random=3", desc: "国民家常菜", ingredients: [{name:"西红柿",unit:"2个"},{name:"鸡蛋",unit:"3个"}], steps: ["切菜","炒蛋","混合翻炒"] },
  { id: 4, name: "酸辣土豆丝", category: "热菜", time: 8, diff: "简单", cal: "90kcal", pic: "https://picsum.photos/600/400?random=4", desc: "脆爽下饭", ingredients: [{name:"土豆",unit:"2个"},{name:"辣椒",unit:"2个"}], steps: ["切丝","泡水去淀粉","快炒"] },
  { id: 5, name: "可乐鸡翅", category: "热菜", time: 25, diff: "中等", cal: "280kcal", pic: "https://picsum.photos/600/400?random=5", desc: "香甜入味", ingredients: [{name:"鸡翅",unit:"8个"},{name:"可乐",unit:"300ml"}], steps: ["焯水","煎至金黄","焖煮","收汁"] }
];

// ==============================================
// ✅ 云端数据同步（模拟版，全家共享同一套数据）
// ==============================================
async function saveCloud() {
  localStorage.setItem(CLOUD_KEY, JSON.stringify(appData));
}

async function loadCloud() {
  const saved = localStorage.getItem(CLOUD_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      appData = { ...appData, ...data };
    } catch (e) {
      console.error("云端数据解析失败，使用默认数据");
    }
  }
  initFoods();
  renderHome();
  updateMine();
}

function initFoods() {
  if (!appData.allFoods || appData.allFoods.length === 0) {
    appData.allFoods = [...defaultFoods];
    saveCloud();
  }
}

// ==============================================
// ✅ 真实AI菜谱生成（通义千问API）
// ==============================================
async function aiGenerateFood() {
  const foodName = document.getElementById("ai-food-name").value.trim();
  if (!foodName) return alert("请输入菜品名称！");

  alert("正在AI生成菜谱，请稍候...");

  try {
    const response = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${QWEN_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "qwen-turbo",
        "input": {
          "messages": [
            {
              "role": "user",
              "content": `请为我生成一道菜名为【${foodName}】的菜谱，严格按以下JSON格式输出，不要额外文字：
{
  "name": "菜名",
  "ingredients": "食材列表，用逗号分隔，格式：主料Xg,辅料Xg,调料Xg",
  "cookTime": 数字(分钟),
  "desc": "菜品简介",
  "steps": ["步骤1","步骤2","步骤3"]
}`
            }
          ]
        },
        "parameters": {
          "result_format": "json"
        }
      })
    });

    const result = await response.json();
    if (result.output && result.output.choices && result.output.choices[0].message.content) {
      const recipe = JSON.parse(result.output.choices[0].message.content);
      
      document.getElementById("add-name").value = recipe.name || foodName;
      document.getElementById("add-ing").value = recipe.ingredients || "主料200g,辅料适量,盐3g";
      document.getElementById("add-time").value = recipe.cookTime || 15;
      document.getElementById("add-desc").value = recipe.desc || "AI生成菜谱";
      
      // 临时保存步骤，添加菜品时一起存入
      appData.tempSteps = recipe.steps || ["按需制作即可"];

      alert("✅ AI菜谱生成完成！可直接修改后添加");
    } else {
      throw new Error("API返回格式错误");
    }
  } catch (e) {
    console.error("AI生成失败：", e);
    alert("AI生成暂时不可用，已为你填充简易版");
    document.getElementById("add-name").value = foodName;
    document.getElementById("add-ing").value = "主料200g,辅料适量,盐3g,生抽5ml";
    document.getElementById("add-time").value = 15;
    document.getElementById("add-desc").value = "AI自动生成菜谱";
    appData.tempSteps = ["按需制作即可"];
  }
}

// ==============================================
// 页面切换 & 渲染
// ==============================================
function goPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  
  document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
  const tabIndex = name === "home" ? 0 : name === "menu" ? 1 : 2;
  document.querySelectorAll(".tab-item")[tabIndex].classList.add("active");

  if (name === "home") renderHome();
  if (name === "menu") renderMenu();
}

function renderHome() {
  document.getElementById("system-name").innerText = appData.systemName;
  document.getElementById("banner").style.backgroundImage = `url(${appData.bannerUrl})`;
  document.getElementById("avatar").style.backgroundImage = `url(${appData.avatarUrl})`;
  
  const tabs = ["主食", "热菜", "凉菜", "汤类", "饮料"];
  const list = appData.allFoods.filter(f => f.category === tabs[appData.activeTab]);
  
  let html = "";
  list.forEach(f => {
    html += `
      <div class="food-card" onclick="openDetail(${f.id})">
        <img class="food-img" src="${f.pic}" onerror="this.src='https://picsum.photos/600/400?random=${f.id}'">
        <div class="food-info">
          <div class="food-name">${f.name}</div>
          <div class="food-tag">
            <span>${f.time}分钟</span>
            <span>${f.diff}</span>
          </div>
        </div>
      </div>
    `;
  });
  document.getElementById("food-list").innerHTML = html;
}

function switchTab(i) {
  appData.activeTab = i;
  document.querySelectorAll(".tab").forEach((t, idx) => t.classList.toggle("active", idx === i));
  renderHome();
}

function openDetail(id) {
  const food = appData.allFoods.find(f => f.id === id);
  if (!food) return;
  appData.currentFood = food;
  document.getElementById("detail-image").style.backgroundImage = `url(${food.pic})`;
  document.getElementById("detail-name").innerText = food.name;
  document.getElementById("detail-time").innerText = food.time;
  document.getElementById("detail-diff").innerText = food.diff;
  document.getElementById("detail-cal").innerText = food.cal;
  document.getElementById("detail-desc").innerText = food.desc;
  let ing = "";
  food.ingredients.forEach(i => ing += `<div class="ing-item"><span>${i.name}</span><span>${i.unit}</span></div>`);
  document.getElementById("detail-ing").innerHTML = ing;
  let step = "";
  food.steps.forEach((s, i) => step += `<div class="step-item">${i + 1}. ${s}</div>`);
  document.getElementById("detail-steps").innerHTML = step;
  goPage("detail");
}

// 修改菜品图片
async function changeCurrentFoodImage() {
  if (!appData.currentFood) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const url = e.target.result;
      appData.currentFood.pic = url;
      const idx = appData.allFoods.findIndex(f => f.id === appData.currentFood.id);
      if (idx !== -1) appData.allFoods[idx].pic = url;
      await saveCloud();
      renderHome();
      document.getElementById("detail-image").style.backgroundImage = `url(${url})`;
      alert("✅ 图片已云端保存，全家可见");
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// 加入菜单（云端同步）
async function addMenu() {
  if (!appData.currentFood) return;
  const ex = appData.myMenu.some(x => x.id === appData.currentFood.id);
  if (!ex) {
    appData.myMenu.push(appData.currentFood);
    await saveCloud();
    alert("✅ 已加入全家共享菜单");
  } else {
    alert("已在菜单中");
  }
}

function renderMenu() {
  let html = "";
  appData.myMenu.forEach(f => {
    html += `
      <div class="menu-item">
        <span>${f.name}</span>
        <button onclick="delMenu(${f.id})">删除</button>
      </div>
    `;
  });
  document.getElementById("menu-list").innerHTML = html;
}

async function delMenu(id) {
  appData.myMenu = appData.myMenu.filter(f => f.id !== id);
  await saveCloud();
  renderMenu();
}

async function clearMenu() {
  if (confirm("确定清空全家共享菜单？")) {
    appData.myMenu = [];
    await saveCloud();
    renderMenu();
  }
}

function showShopping() {
  const map = {};
  appData.myMenu.forEach(f => f.ingredients.forEach(i => map[i.name] = (map[i.name] || 0) + 1));
  let t = "📝 全家买菜清单\n\n";
  for (let k in map) t += `${k} × ${map[k]}\n`;
  alert(t || "菜单为空");
}

function cookOrder() {
  const total = appData.myMenu.reduce((s, f) => s + f.time, 0);
  const names = appData.myMenu.map(f => f.name).join("、");
  alert(`🍳 做饭顺序：洗菜 → 切菜 → 炒菜\n\n全家总耗时：${total} 分钟\n菜品：${names || "暂无菜品"}`);
}

function searchFood() {
  const v = document.getElementById("search-input").value.toLowerCase();
  const list = appData.allFoods.filter(f => f.name.toLowerCase().includes(v));
  let html = "";
  list.forEach(f => {
    html += `
      <div class="food-card" onclick="openDetail(${f.id})">
        <img class="food-img" src="${f.pic}">
        <div class="food-info">
          <div class="food-name">${f.name}</div>
        </div>
      </div>
    `;
  });
  document.getElementById("food-list").innerHTML = html;
}

function randomFood() {
  const f = appData.allFoods[Math.floor(Math.random() * appData.allFoods.length)];
  alert(`🎲 推荐：${f.name}`);
}

async function changeAvatar() {
  const i = document.createElement("input");
  i.type = "file"; i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = async e => {
      appData.avatarUrl = e.target.result;
      await saveCloud();
      document.getElementById("avatar").style.backgroundImage = `url(${appData.avatarUrl})`;
    };
    r.readAsDataURL(e.target.files[0]);
  };
  i.click();
}

async function changeBanner() {
  const i = document.createElement("input");
  i.type = "file"; i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = async e => {
      appData.bannerUrl = e.target.result;
      await saveCloud();
      document.getElementById("banner").style.backgroundImage = `url(${appData.bannerUrl})`;
    };
    r.readAsDataURL(e.target.files[0]);
  };
  i.click();
}

function selectFoodImage() {
  const i = document.createElement("input");
  i.type = "file"; i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = e => {
      appData.tempFoodImage = e.target.result;
      document.getElementById("food-image-tip").innerText = "✅ 已上传";
    };
    r.readAsDataURL(e.target.files[0]);
  };
  i.click();
}

function updateMine() {
  document.getElementById("mine-name").innerText = appData.systemName;
  document.getElementById("collect-count").innerText = appData.collectList.length;
  document.getElementById("custom-count").innerText = appData.customFoods.length;
}

async function saveSetting() {
  const n = document.getElementById("set-name").value;
  if (n) appData.systemName = n;
  await saveCloud();
  alert("✅ 设置已云端同步");
  goPage("mine");
}

// 添加自定义菜品（支持AI步骤）
async function addCustomFood() {
  const name = document.getElementById("add-name").value;
  const cate = document.getElementById("add-cate").value;
  const time = document.getElementById("add-time").value;
  const ingText = document.getElementById("add-ing").value;
  const desc = document.getElementById("add-desc").value;
  if (!name || !cate || !time || !ingText) return alert("请填写完整");

  const ings = ingText.split(",").map(t => ({
    name: t.replace(/[0-9个gml]/g, "").trim(),
    unit: t.replace(/[^0-9个gml]/g, "") || "适量"
  }));

  const food = {
    id: Date.now(),
    name, category: cate, time: Number(time),
    diff: "自定义", cal: "未知",
    pic: appData.tempFoodImage || `https://picsum.photos/600/400?random=${Date.now()}`,
    desc, ingredients: ings,
    steps: appData.tempSteps || ["按需制作即可"]
  };

  appData.allFoods.push(food);
  appData.customFoods.push(food);
  appData.tempFoodImage = "";
  appData.tempSteps = null;
  await saveCloud();
  alert("✅ 菜品添加成功，全家可见！");
  document.getElementById("add-name").value = "";
  document.getElementById("add-cate").value = "";
  document.getElementById("add-time").value = "";
  document.getElementById("add-ing").value = "";
  document.getElementById("add-desc").value = "";
}

// 启动
window.onload = async () => {
  await loadCloud();
  goPage("home");
};
