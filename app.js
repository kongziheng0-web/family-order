// 🔴 把下面换成你自己的通义千问 Key
const QWEN_API_KEY = "sk-8ac5c826f0f94b64b63c46bc22076353";
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

// Firebase 配置（保持你原来的，不用改）
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

// 全局数据
let appData = {
  systemName: "小恒家厨房",
  myMenu: [],
  allFoods: [],
  activeTab: 0,
  currentFood: null
};

// 默认菜品
const defaultFoods = [
  { id: 1, name: "米饭", category: "主食", time: 20, diff: "简单", pic: "https://picsum.photos/id/292/600/400", desc: "软糯白米饭", ingredients: [{name:"大米",unit:"200g"}], steps: ["淘米","煮饭"] },
  { id: 2, name: "面条", category: "主食", time: 10, diff: "简单", pic: "https://picsum.photos/id/431/600/400", desc: "清水煮面", ingredients: [{name:"面条",unit:"150g"}], steps: ["烧水","煮面"] },
  { id: 3, name: "番茄炒蛋", category: "热菜", time: 10, diff: "简单", pic: "https://picsum.photos/id/488/600/400", desc: "国民家常菜", ingredients: [{name:"番茄",unit:"2个"},{name:"鸡蛋",unit:"3个"}], steps: ["切菜","炒蛋","翻炒"] }
];

// ========== 云端同步（保留） ==========
function cloudSave() {
  cloudRef.set(appData);
}

cloudRef.on("value", snapshot => {
  const data = snapshot.val();
  if (data) {
    const keep = appData.currentFood;
    appData = data;
    appData.currentFood = keep;
    renderHome();
    renderMenu();
  }
});

// ========== 页面切换 ==========
function goPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
}

// ========== 底部导航（修复：点击必变色） ==========
function switchTabbar(index) {
  document.querySelectorAll(".tabbar .tab-item").forEach((t, i) => {
    t.classList.toggle("active", i === index);
  });
  if (index === 0) goPage("home");
  if (index === 1) goPage("menu");
  if (index === 2) goPage("mine");
}

// ========== 分类切换 ==========
function switchTab(index) {
  appData.activeTab = index;
  document.querySelectorAll(".category-tabs .tab").forEach((t, i) => {
    t.classList.toggle("active", i === index);
  });
  renderHome();
}

// ========== 渲染首页 ==========
function renderHome() {
  const tabs = ["主食","热菜","凉菜","汤类","饮料"];
  const list = appData.allFoods.filter(f => f.category === tabs[appData.activeTab]);
  let html = "";
  list.forEach(f => {
    html += `<div class="food-card" onclick="openDetail(${f.id})">
      <img class="food-img" src="${f.pic}">
      <div class="food-name">${f.name}</div>
    </div>`;
  });
  document.getElementById("food-list").innerHTML = html;
}

// ========== 打开菜品详情 ==========
function openDetail(id) {
  const food = appData.allFoods.find(f => f.id === id);
  if (!food) return;
  appData.currentFood = food;
  document.getElementById("detail-image").style.backgroundImage = `url(${food.pic})`;
  document.getElementById("detail-name").innerText = food.name;
  document.getElementById("detail-time").innerText = food.time;
  document.getElementById("detail-diff").innerText = food.diff;
  document.getElementById("detail-desc").innerText = food.desc;

  let ingHtml = "";
  food.ingredients.forEach(i => ingHtml += `<div>${i.name} ${i.unit}</div>`);
  document.getElementById("detail-ing").innerHTML = ingHtml;

  let stepHtml = "";
  food.steps.forEach((s, i) => stepHtml += `<div>${i+1}. ${s}</div>`);
  document.getElementById("detail-steps").innerHTML = stepHtml;

  goPage("detail");
}

// ========== 加入菜单（修复：100%可用） ==========
function addMenu() {
  if (!appData.currentFood) {
    alert("❌ 请先打开一个菜品");
    return;
  }
  const remark = document.getElementById("order-remark").value || "无备注";
  const exists = appData.myMenu.find(m => m.id === appData.currentFood.id);
  if (!exists) {
    appData.myMenu.push({...appData.currentFood, remark});
    cloudSave();
    alert("✅ 加入菜单成功！");
  } else {
    alert("⚠️ 已在菜单中");
  }
}

// ========== 渲染菜单 ==========
function renderMenu() {
  let html = "";
  appData.myMenu.forEach(m => {
    html += `<div class="menu-item">${m.name} <small>${m.remark}</small></div>`;
  });
  document.getElementById("menu-list").innerHTML = html;
}

// ========== AI生成（修复：必出时间+可用） ==========
async function aiGenAll() {
  const name = document.getElementById("ai-food-name").value.trim();
  if (!name) return alert("❌ 请输入菜名");
  alert("🤖 AI生成中...");

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
            content: `生成${name}菜谱，必须包含cookTime（分钟），严格返回JSON：{"name":"","cookTime":"","ingredients":"","desc":"","steps":[""]}`
          }]
        },
        parameters: { result_format: "json" }
      })
    });

    const data = await res.json();
    const r = JSON.parse(data.output.choices[0].message.content);

    document.getElementById("add-name").value = r.name || name;
    document.getElementById("add-time").value = r.cookTime || 15;
    document.getElementById("add-ing").value = r.ingredients || "食材适量";
    document.getElementById("add-desc").value = r.desc || "家常菜";
    document.getElementById("add-cate").value = getCate(name);

    alert("✅ AI生成完成！");
  } catch (e) {
    console.error(e);
    alert("⚠️ AI失败，已自动填充");
    document.getElementById("add-name").value = name;
    document.getElementById("add-time").value = 15;
    document.getElementById("add-ing").value = "食材适量";
    document.getElementById("add-desc").value = "家常菜";
    document.getElementById("add-cate").value = getCate(name);
  }
}

function getCate(name) {
  if (name.includes("饭")||name.includes("面")) return "主食";
  if (name.includes("汤")) return "汤类";
  if (name.includes("凉")) return "凉菜";
  return "热菜";
}

// ========== 添加菜品 ==========
function addCustomFood() {
  const name = document.getElementById("add-name").value;
  const cate = document.getElementById("add-cate").value;
  const time = document.getElementById("add-time").value;
  const ing = document.getElementById("add-ing").value;
  const desc = document.getElementById("add-desc").value;
  if (!name || !cate || !time || !ing) return alert("❌ 填完整");

  const food = {
    id: Date.now(),
    name, category: cate, time: Number(time), diff: "自定义",
    pic: "https://picsum.photos/600/400?" + Date.now(),
    desc,
    ingredients: ing.split(",").map(x => ({name:x.trim(), unit:"适量"})),
    steps: ["准备","制作","完成"]
  };

  appData.allFoods.push(food);
  cloudSave();
  alert("✅ 添加成功！");
}

// ========== 初始化 ==========
window.onload = function() {
  if (!appData.allFoods.length) {
    appData.allFoods = defaultFoods;
    cloudSave();
  }
  renderHome();
  renderMenu();
};
