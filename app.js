// ==============================================
// 家庭点菜系统 终极增强版
// 新增：AI一键生成+自动分类+自动菜品图+点菜备注
// ==============================================
const QWEN_API_KEY = "sk-0996e11059b645cb9d0465fff29a7211";
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

// 内置菜品图库 自动匹配图片
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

// ======================
// 本地存储 稳定不报错
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
  renderMenu();
}

function initFoods() {
  if (!appData.allFoods || appData.allFoods.length === 0) {
    appData.allFoods = [...defaultFoods];
    saveData();
  }
}

// ======================
// 智能匹配菜品分类
// ======================
function getFoodCategory(name) {
  let n = name.toLowerCase();
  if(n.includes("饭")||n.includes("粥")||n.includes("馒头")||n.includes("包子")) return "主食";
  if(n.includes("汤")||n.includes("羹")) return "汤类";
  if(n.includes("拌")||n.includes("凉菜")||n.includes("黄瓜")) return "凉菜";
  if(n.includes("奶茶")||n.includes("果汁")||n.includes("可乐")) return "饮料";
  return "热菜";
}

// ======================
// 智能匹配菜品图片
// ======================
function getFoodAutoImg(name) {
  for(let key in foodImgLib){
    if(name.includes(key)) return foodImgLib[key];
  }
  return `https://picsum.photos/600/400?random=${Date.now()}`;
}

// ======================
// 🤖 AI 一键全能生成：分类+图片+食材+时间+描述+做法
// ======================
async function aiGenAll() {
  const foodName = document.getElementById("ai-food-name").value.trim();
  if (!foodName) return alert("请输入菜名！");
  alert("AI 正在一键生成全部信息，请稍候...");

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
            content: `给我生成【${foodName}】菜谱，严格只返回JSON，不要多余文字：
{
  "name":"菜名",
  "ingredients":"食材用逗号分隔",
  "cookTime":"数字分钟",
  "desc":"简短菜品简介",
  "steps":["步骤1","步骤2","步骤3"]
}`
          }]
        },
        parameters: { result_format: "json" }
      })
    });

    const data = await res.json();
    const recipe = JSON.parse(data.output.choices[0].message.content);

    // 自动填充所有表单
    document.getElementById("add-name").value = recipe.name || foodName;
    document.getElementById("add-cate").value = getFoodCategory(foodName);
    document.getElementById("add-time").value = recipe.cookTime || 15;
    document.getElementById("add-ing").value = recipe.ingredients;
    document.getElementById("add-desc").value = recipe.desc || "家常美味";

    // 自动配图
    appData.tempFoodImage = getFoodAutoImg(foodName);
    appData.tempSteps = recipe.steps;

    alert("✅ AI一键生成完成：分类+图片+食材+做法全部自动填好！");
  } catch (e) {
    alert("AI生成失败，已自动基础填充");
    document.getElementById("add-name").value = foodName;
    document.getElementById("add-cate").value = getFoodCategory(foodName);
    document.getElementById("add-time").value = 15;
    document.getElementById("add-ing").value = "主料300g,盐3g,生抽适量";
    document.getElementById("add-desc").value = "家常美味";
    appData.tempFoodImage = getFoodAutoImg(foodName);
    appData.tempSteps = ["准备食材","热锅烹饪","出锅装盘"];
  }
}

// ======================
// 页面渲染
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
      <img class="food-img" src="${f.pic}" onerror="this.src='https://picsum.photos/600/400?random=${f.id}'">
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
  // 清空上次备注
  document.getElementById("order-remark").value = "";
  goPage("detail");
}

// ======================
// 点菜加入菜单 + 保存备注
// ======================
function addMenu() {
  if (!appData.currentFood) return;
  let remark = document.getElementById("order-remark").value.trim();

  let exist = appData.myMenu.find(x => x.id === appData.currentFood.id);
  if(!exist){
    let foodWithRemark = {
      ...appData.currentFood,
      remark: remark || "无备注"
    };
    appData.myMenu.push(foodWithRemark);
  }else{
    exist.remark = remark || "无备注";
  }
  saveData();
  renderMenu();
  alert("✅ 已加入菜单，备注已保存！");
}

// ======================
// 渲染菜单 显示每个人备注
// ======================
function renderMenu() {
  let html = "";
  appData.myMenu.forEach(f => {
    html += `
    <div class="menu-item" style="flex-direction:column;align-items:flex-start;padding:10px;">
      <div style="display:flex;justify-content:space-between;width:100%;">
        <span style="font-weight:bold;">${f.name}</span>
        <button onclick="delMenu(${f.id})">删除</button>
      </div>
      <div style="font-size:13px;color:#666;margin-top:4px;">📝 备注：${f.remark||"无备注"}</div>
    </div>`;
  });
  document.getElementById("menu-list").innerHTML = html;
}

async function delMenu(id) {
  appData.myMenu = appData.myMenu.filter(f => f.id !== id);
  saveData();
  renderMenu();
}

function clearMenu() {
  if (confirm("确定清空全家共享菜单？")) {
    appData.myMenu = [];
    saveData();
    renderMenu();
  }
}

// ======================
// 其他原有功能不变
// ======================
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
  alert(`🍳 做饭总耗时：${total} 分钟\n菜品：${names || "暂无菜品"}`);
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
  alert(`🎲 随机推荐今晚吃：${f.name}`);
}

function changeAvatar() {
  const i = document.createElement("input");
  i.type = "file"; i.accept = "image/*";
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
  i.type = "file"; i.accept = "image/*";
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
  i.type = "file"; i.accept = "image/*";
  i.onchange = e => {
    const r = new FileReader();
    r.onload = e => {
      appData.tempFoodImage = e.target.result;
      document.getElementById("food-image-tip").innerText = "✅ 已手动上传图片";
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
  alert("✅ 设置已保存");
  goPage("mine");
}

function addCustomFood() {
  const name = document.getElementById("add-name").value;
  const cate = document.getElementById("add-cate").value;
  const time = document.getElementById("add-time").value;
  const ingText = document.getElementById("add-ing").value;
  const desc = document.getElementById("add-desc").value;
  if (!name || !cate || !time || !ingText) return alert("请等待AI生成或填完所有信息");

  const ings = ingText.split(",").map(t => ({
    name: t.replace(/[0-9个gml]/g, "").trim(),
    unit: t.replace(/[^0-9个gml]/g, "") || "适量"
  }));

  const food = {
    id: Date.now(),
    name, category: cate, time: Number(time),
    diff: "AI智能", cal: "未知",
    pic: appData.tempFoodImage || getFoodAutoImg(name),
    desc, ingredients: ings,
    steps: appData.tempSteps || ["按需制作即可"],
    remark:"无备注"
  };

  appData.allFoods.push(food);
  appData.customFoods.push(food);
  appData.tempFoodImage = "";
  appData.tempSteps = [];
  saveData();
  alert("✅ 菜品添加成功，自动分类+自动配图完成！");
  document.getElementById("ai-food-name").value = "";
  document.getElementById("add-name").value = "";
  document.getElementById("add-cate").value = "";
  document.getElementById("add-time").value = "";
  document.getElementById("add-ing").value = "";
  document.getElementById("add-desc").value = "";
  document.getElementById("food-image-tip").innerText = "未上传自动用AI配图";
  renderHome();
}

// 初始化
window.onload = () => {
  loadData();
  goPage("home");
};
