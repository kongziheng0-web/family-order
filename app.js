// ==============================================
// 家庭点菜系统 - 真实AI + 稳定无报错版
// ==============================================
const QWEN_API_KEY = "sk-0996e11059b645cb9d0465fff29a7211"; // ← 填入你的
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

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
  tempFoodImage: "",
  tempSteps: []
};

const defaultFoods = [
  { id: 1, name: "米饭", category: "主食", time: 20, diff: "简单", cal: "130kcal", pic: "https://picsum.photos/600/400?random=1", desc: "软糯白米饭", ingredients: [{name:"大米",unit:"200g"},{name:"清水",unit:"300ml"}], steps: ["淘洗大米","浸泡10分钟","电饭煲煮饭","焖5分钟"] },
  { id: 2, name: "面条", category: "主食", time: 10, diff: "简单", cal: "110kcal", pic: "https://picsum.photos/600/400?random=2", desc: "清水煮面", ingredients: [{name:"面条",unit:"150g"},{name:"水",unit:"500ml"}], steps: ["烧水","煮面","捞出"] },
  { id: 3, name: "番茄炒蛋", category: "热菜", time: 10, diff: "简单", cal: "150kcal", pic: "https://picsum.photos/600/400?random=3", desc: "国民家常菜", ingredients: [{name:"西红柿",unit:"2个"},{name:"鸡蛋",unit:"3个"}], steps: ["切菜","炒蛋","混合翻炒"] },
];

// ======================
// 本地存储（无同步失败）
// ======================
function saveData() {
  localStorage.setItem("family_order_final", JSON.stringify(appData));
}

function loadData() {
  try {
    let d = localStorage.getItem("family_order_final");
    if (d) appData = { ...appData, ...JSON.parse(d) };
  } catch (e) {}
  initFoods();
  renderHome();
  updateMine();
}

function initFoods() {
  if (!appData.allFoods || appData.allFoods.length === 0) {
    appData.allFoods = [...defaultFoods];
    saveData();
  }
}

// ======================
// 🤖 真实AI生成菜谱（你自己的API）
// ======================
async function aiGenerateFood() {
  const foodName = document.getElementById("ai-food-name").value.trim();
  if (!foodName) return alert("请输入菜品名称！");
  alert("AI 正在生成菜谱...");

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
            content: `生成菜品【${foodName}】的菜谱，严格返回JSON：
{
  "name":"${foodName}",
  "ingredients":"食材用逗号分隔",
  "cookTime":15,
  "desc":"简介",
  "steps":["步骤1","步骤2","步骤3"]
}`
          }]
        },
        parameters: { result_format: "json" }
      })
    });

    const data = await res.json();
    const recipe = JSON.parse(data.output.choices[0].message.content);

    document.getElementById("add-name").value = recipe.name;
    document.getElementById("add-ing").value = recipe.ingredients;
    document.getElementById("add-time").value = recipe.cookTime;
    document.getElementById("add-desc").value = recipe.desc;
    appData.tempSteps = recipe.steps;

    alert("✅ AI 生成完成！");
  } catch (e) {
    alert("AI生成暂时不可用，使用内置模板");
    document.getElementById("add-name").value = foodName;
    document.getElementById("add-ing").value = "主料300g,盐3g,油10ml";
    document.getElementById("add-time").value = 20;
    document.getElementById("add-desc").value = "AI 智能菜谱";
    appData.tempSteps = ["准备食材","烹饪","出锅"];
  }
}

// ======================
// 页面逻辑
// ======================
function goPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
  let idx = name === "home" ? 0 : name === "menu" ? 1 : 2;
  document.querySelectorAll(".tab-item")[idx].classList.add("active");
  if (name === "home") renderHome();
  if (name === "menu") renderMenu();
}

function renderHome() {
  document.getElementById("system-name").innerText = appData.systemName;
  document.getElementById("banner").style.backgroundImage = `url(${appData.bannerUrl})`;
  document.getElementById("avatar").style.backgroundImage = `url(${appData.avatarUrl})`;
  const tabs = ["主食","热菜","凉菜","汤类","饮料"];
  const list = appData.allFoods.filter(f => f.category === tabs[appData.activeTab]);
  let html = "";
  list.forEach(f => {
    html += `
    <div class="food-card" onclick="openDetail(${f.id})">
      <img class="food-img" src="${f.pic}">
      <div class="food-info">
        <div class="food-name">${f.name}</div>
        <div class="food-tag">
          <span>${f.time}分钟</span>
          <span>${f.diff}</span>
        </div>
      </div>
    </div>`;
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
  food.steps.forEach((s, i) => step += `<div class="step-item">${i+1}. ${s}</div>`);
  document.getElementById("detail-steps").innerHTML = step;
  goPage("detail");
}

// ======================
// 功能按钮
// ======================
function changeCurrentFoodImage() {
  if (!appData.currentFood) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = e => {
    const r = new FileReader();
    r.onload = e => {
      const url = e.target.result;
      appData.currentFood.pic = url;
      const idx = appData.allFoods.findIndex(f => f.id === appData.currentFood.id);
      if (idx !== -1) appData.allFoods[idx].pic = url;
      saveData();
      renderHome();
      document.getElementById("detail-image").style.backgroundImage = `url(${url})`;
      alert("✅ 图片保存成功");
    };
    r.readAsDataURL(e.target.files[0]);
  };
  input.click();
}

function addMenu() {
  if (!appData.currentFood) return;
  if (!appData.myMenu.some(x => x.id === appData.currentFood.id)) {
    appData.myMenu.push(appData.currentFood);
    saveData();
    alert("✅ 已加入菜单");
  } else alert("已在菜单中");
}

function renderMenu() {
  let html = "";
  appData.myMenu.forEach(f => {
    html += `
    <div class="menu-item">
      <span>${f.name}</span>
      <button onclick="delMenu(${f.id})">删除</button>
    </div>`;
  });
  document.getElementById("menu-list").innerHTML = html;
}

function delMenu(id) {
  appData.myMenu = appData.myMenu.filter(f => f.id !== id);
  saveData();
  renderMenu();
}

function clearMenu() {
  if (confirm("确定清空菜单？")) {
    appData.myMenu = [];
    saveData();
    renderMenu();
  }
}

function showShopping() {
  const map = {};
  appData.myMenu.forEach(f => f.ingredients.forEach(i => map[i.name] = (map[i.name] || 0) + 1));
  let t = "📝 买菜清单\n\n";
  for (let k in map) t += `${k} × ${map[k]}\n`;
  alert(t || "菜单为空");
}

function cookOrder() {
  const total = appData.myMenu.reduce((s, f) => s + f.time, 0);
  const names = appData.myMenu.map(f => f.name).join("、");
  alert(`总耗时：${total} 分钟\n菜品：${names || "暂无"}`);
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
    </div>`;
  });
  document.getElementById("food-list").innerHTML = html;
}

function randomFood() {
  const f = appData.allFoods[Math.floor(Math.random() * appData.allFoods.length)];
  alert(`🎲 推荐：${f.name}`);
}

function changeAvatar() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = e => {
      appData.avatarUrl = e.target.result;
      saveData();
      document.getElementById("avatar").style.backgroundImage = `url(${appData.avatarUrl})`;
    };
    r.readAsDataURL(e.target.files[0]);
  };
  i.click();
}

function changeBanner() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = e => {
      appData.bannerUrl = e.target.result;
      saveData();
      document.getElementById("banner").style.backgroundImage = `url(${appData.bannerUrl})`;
    };
    r.readAsDataURL(e.target.files[0]);
  };
  i.click();
}

function selectFoodImage() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = "image/*";
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

function saveSetting() {
  const n = document.getElementById("set-name").value;
  if (n) appData.systemName = n;
  saveData();
  alert("✅ 保存成功");
  goPage("mine");
}

function addCustomFood() {
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
    diff: "AI生成", cal: "未知",
    pic: appData.tempFoodImage || "https://picsum.photos/600/400?random="+Date.now(),
    desc, ingredients: ings, steps: appData.tempSteps || ["按需制作"]
  };

  appData.allFoods.push(food);
  appData.customFoods.push(food);
  appData.tempFoodImage = "";
  appData.tempSteps = [];
  saveData();
  alert("✅ 添加成功！");
  document.getElementById("add-name").value = "";
  document.getElementById("add-cate").value = "";
  document.getElementById("add-time").value = "";
  document.getElementById("add-ing").value = "";
  document.getElementById("add-desc").value = "";
}

window.onload = () => {
  loadData();
  goPage("home");
};
