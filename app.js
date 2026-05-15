const QWEN_API_KEY = "sk-8ac5c826f0f94b64b63c46bc22076353";
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

const firebaseConfig = {
  apiKey: "AIzaSyA4z0YlH0Z0lYD0xNl0Yt0000000000000",
  authDomain: "family-menu-10086.firebaseapp.com",
  databaseURL: "https://family-menu-10086-default-rtdb.firebaseio.com",
  projectId: "family-menu-10086",
  storageBucket: "family-menu-10086.appspot.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const cloudRef = db.ref("familyData");

let appData = {
  systemName: "小恒家厨房",
  bannerUrl: "https://picsum.photos/800/400",
  avatarUrl: "https://picsum.photos/200/200",
  myMenu: [],
  collectList: [],
  customFoods: [],
  allFoods: [],
  fridgeItems: [], // 新增：冰箱食材
  activeTab: 0,
  currentFood: null
};

const foodImgLib = {
  "米饭":"https://picsum.photos/id/292/600/400",
  "面条":"https://picsum.photos/id/431/600/400",
  "番茄炒蛋":"https://picsum.photos/id/488/600/400",
  "红烧肉":"https://picsum.photos/id/312/600/400",
  "可乐鸡翅":"https://picsum.photos/id/326/600/400",
  "土豆丝":"https://picsum.photos/id/345/600/400",
  "排骨汤":"https://picsum.photos/id/287/600/400",
  "奶茶":"https://picsum.photos/id/295/600/400"
};

const defaultFoods = [
  { id: 1, name: "米饭", category: "主食", time: 20, diff: "简单", cal: "130kcal", pic: foodImgLib["米饭"], desc: "软糯白米饭", ingredients: [{name:"大米",unit:"200g"},{name:"清水",unit:"300ml"}], steps: ["淘洗大米","浸泡10分钟","电饭煲煮饭","焖5分钟"] },
  { id: 2, name: "面条", category: "主食", time: 10, diff: "简单", cal: "110kcal", pic: foodImgLib["面条"], desc: "清水煮面", ingredients: [{name:"面条",unit:"150g"}], steps: ["烧水","煮面","捞出"] },
  { id: 3, name: "番茄炒蛋", category: "热菜", time: 10, diff: "简单", cal: "150kcal", pic: foodImgLib["番茄炒蛋"], desc: "国民家常菜", ingredients: [{name:"西红柿",unit:"2个"},{name:"鸡蛋",unit:"3个"}], steps: ["切菜","炒蛋","混合翻炒"] }
];

// 云端保存
function cloudSave() {
  cloudRef.set(appData);
}

// 云端同步监听（修复：不覆盖 currentFood）
cloudRef.on("value", function(snapshot) {
  var data = snapshot.val();
  if (data) {
    const keepCurrentFood = appData.currentFood;
    appData = data;
    appData.currentFood = keepCurrentFood;
    renderHome();
    renderMenu();
    renderFridge();
    updateMine();
  }
});

// 初始化默认菜品
function initData() {
  if (!appData.allFoods || appData.allFoods.length === 0) {
    appData.allFoods = defaultFoods;
    cloudSave();
  }
}

// 页面切换
function goPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
}

// 底部导航切换（修复：加 active 样式 + 支持4个导航）
function switchTabbar(index) {
  document.querySelectorAll(".tabbar .tab-item").forEach((tab, i) => {
    tab.classList.toggle("active", i === index);
  });
  if (index === 0) goPage("home");
  if (index === 1) goPage("menu");
  if (index === 2) { goPage("fridge"); renderFridge(); }
  if (index === 3) goPage("mine");
}

// 分类切换
function switchTab(index) {
  appData.activeTab = index;
  document.querySelectorAll(".category-tabs .tab").forEach((tab, i) => {
    tab.classList.toggle("active", i === index);
  });
  renderHome();
}

// 渲染首页
function renderHome() {
  const tabs = ["主食", "热菜", "凉菜", "汤类", "饮料"];
  const list = appData.allFoods.filter(f => f.category === tabs[appData.activeTab]);
  let html = "";
  list.forEach(f => {
    html += `<div class="food-card" onclick="openDetail(${f.id})">
      <img class="food-img" src="${f.pic}">
      <div class="food-name">${f.name}</div>
    </div>`;
  });
  document.getElementById("food-list").innerHTML = html;
  document.getElementById("system-name").innerText = appData.systemName;
}

// 打开菜品详情
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

  let ingHtml = "";
  food.ingredients.forEach(i => ingHtml += `<div class="ing-item">${i.name} ${i.unit}</div>`);
  document.getElementById("detail-ing").innerHTML = ingHtml;

  let stepHtml = "";
  food.steps.forEach((s, i) => stepHtml += `<div class="step-item">${i+1}. ${s}</div>`);
  document.getElementById("detail-steps").innerHTML = stepHtml;

  goPage("detail");
}

// 加入菜单（修复：100%可用）
function addMenu() {
  if (!appData.currentFood) {
    alert("❌ 未选中菜品，请先在列表点开菜品");
    return;
  }
  const remark = document.getElementById("order-remark").value || "无备注";
  const exist = appData.myMenu.find(m => m.id === appData.currentFood.id);
  if (!exist) {
    appData.myMenu.push({ ...appData.currentFood, remark });
    cloudSave();
    alert("✅ 加入菜单成功！已同步到全家设备");
  } else {
    alert("⚠️ 该菜品已在菜单中");
  }
}

// 渲染菜单（恢复所有按钮）
function renderMenu() {
  let html = "";
  appData.myMenu.forEach(m => {
    html += `<div class="menu-item">
      ${m.name} <small>备注：${m.remark}</small>
      <button onclick="delMenu(${m.id})">删除</button>
    </div>`;
  });
  document.getElementById("menu-list").innerHTML = html;
}

// 删除菜单
function delMenu(id) {
  appData.myMenu = appData.myMenu.filter(m => m.id !== id);
  cloudSave();
}

// 清空菜单（恢复）
function clearMenu() {
  if (confirm("确定清空菜单？")) {
    appData.myMenu = [];
    cloudSave();
  }
}

// 买菜清单（恢复）
function showShopping() {
  let map = {};
  appData.myMenu.forEach(m => m.ingredients.forEach(i => map[i.name] = (map[i.name] || 0) + 1));
  let text = "🧾 买菜清单\n";
  for (let k in map) text += `${k} ×${map[k]}\n`;
  alert(text);
}

// 做饭顺序（恢复）
function cookOrder() {
  let total = appData.myMenu.reduce((s, m) => s + m.time, 0);
  alert(`总烹饪时间：${total} 分钟`);
}

// 搜索
function searchFood() {
  const key = document.getElementById("search-input").value.toLowerCase();
  const list = appData.allFoods.filter(f => f.name.toLowerCase().includes(key));
  let html = "";
  list.forEach(f => {
    html += `<div class="food-card" onclick="openDetail(${f.id})">
      <img class="food-img" src="${f.pic}">
      <div class="food-name">${f.name}</div>
    </div>`;
  });
  document.getElementById("food-list").innerHTML = html;
}

// 随机推荐
function randomFood() {
  const f = appData.allFoods[Math.floor(Math.random() * appData.allFoods.length)];
  alert(`今天吃：${f.name}`);
}

// AI 生成菜谱（修复：必出时间+可用）
async function aiGenAll() {
  const foodName = document.getElementById("ai-food-name").value.trim();
  if (!foodName) return alert("❌ 请输入菜名");
  alert("🤖 AI 生成中，请稍候…");

  try {
    const res = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + QWEN_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen-turbo",
        input: {
          messages: [{
            role: "user",
            content: `生成${foodName}标准菜谱，必须包含制作时间（分钟），严格返回JSON：{"name":"","cookTime":"","ingredients":"","desc":"","steps":[""]}`
          }]
        },
        parameters: { result_format: "json" }
      })
    });

    const data = await res.json();
    if (!data.output || !data.output.choices) throw new Error("AI返回异常");

    const r = JSON.parse(data.output.choices[0].message.content);

    // 强制回填，确保有时间
    document.getElementById("add-name").value = r.name || foodName;
    document.getElementById("add-time").value = r.cookTime || 15;
    document.getElementById("add-ing").value = r.ingredients || "食材适量";
    document.getElementById("add-desc").value = r.desc || "美味家常菜";
    document.getElementById("add-cate").value = getFoodCategory(foodName);

    alert("✅ AI生成完成！时间已自动填入");
  } catch (e) {
    console.error("AI错误：", e);
    alert("⚠️ AI生成失败，已自动填充默认值，请手动补全");
    document.getElementById("add-name").value = foodName;
    document.getElementById("add-time").value = 15;
    document.getElementById("add-ing").value = "食材适量";
    document.getElementById("add-desc").value = "美味家常菜";
    document.getElementById("add-cate").value = getFoodCategory(foodName);
  }
}

function getFoodCategory(name) {
  if (name.includes("饭")||name.includes("面")) return "主食";
  if (name.includes("汤")) return "汤类";
  if (name.includes("拌")||name.includes("凉")) return "凉菜";
  if (name.includes("奶茶")||name.includes("汁")) return "饮料";
  return "热菜";
}

// 添加菜品
function addCustomFood() {
  const name = document.getElementById("add-name").value;
  const cate = document.getElementById("add-cate").value;
  const time = document.getElementById("add-time").value;
  const ingText = document.getElementById("add-ing").value;
  const desc = document.getElementById("add-desc").value;
  if (!name || !cate || !time || !ingText) return alert("❌ 请填完整信息");

  const ings = ingText.split(",").map(t => ({
    name: t.replace(/[0-9g个ml]/g, "").trim(),
    unit: t.replace(/[^0-9g个ml]/g, "") || "适量"
  }));

  const food = {
    id: Date.now(),
    name, category: cate, time: Number(time),
    diff: "自定义", cal: "未知",
    pic: "https://picsum.photos/600/400?" + Date.now(),
    desc, ingredients: ings,
    steps: ["准备食材", "开始制作", "完成出锅"]
  };

  appData.allFoods.push(food);
  appData.customFoods.push(food);
  cloudSave();
  alert("✅ 菜品添加成功！已同步");
}

// ========== 新增：冰箱食材管理 ==========
function addFridgeItem() {
  const itemName = document.getElementById("fridge-item").value.trim();
  if (!itemName) return alert("请输入食材名称");
  appData.fridgeItems.push({ id: Date.now(), name: itemName });
  cloudSave();
  document.getElementById("fridge-item").value = "";
  renderFridge();
}

function delFridgeItem(id) {
  appData.fridgeItems = appData.fridgeItems.filter(item => item.id !== id);
  cloudSave();
  renderFridge();
}

function renderFridge() {
  let html = "";
  appData.fridgeItems.forEach(item => {
    html += `<div class="menu-item">
      ${item.name}
      <button onclick="delFridgeItem(${item.id})">删除</button>
    </div>`;
  });
  document.getElementById("fridge-list").innerHTML = html || "<p style='text-align:center;color:#999;'>冰箱暂无食材</p>";
}

// 头像、背景、设置（恢复）
function changeAvatar() { const i = document.createElement("input"); i.type = "file"; i.onchange = e => { const r = new FileReader(); r.onload = e => { appData.avatarUrl = e.target.result; cloudSave(); }; r.readAsDataURL(e.target.files[0]); }; i.click(); }
function changeBanner() { const i = document.createElement("input"); i.type = "file"; i.onchange = e => { const r = new FileReader(); r.onload = e => { appData.bannerUrl = e.target.result; cloudSave(); }; r.readAsDataURL(e.target.files[0]); }; i.click(); }
function saveSetting() { const n = document.getElementById("set-name").value; if (n) appData.systemName = n; cloudSave(); alert("✅ 设置已同步"); goPage("mine"); }
function updateMine() { 
  document.getElementById("mine-name").innerText = appData.systemName; 
  document.getElementById("collect-count").innerText = appData.collectList.length;
  document.getElementById("custom-count").innerText = appData.customFoods.length;
}
function selectFoodImage(){}

// 启动
window.onload = function() {
  initData();
  renderHome();
  renderMenu();
  renderFridge();
  updateMine();
};
