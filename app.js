const QWEN_API_KEY = "sk-0996e11059b645cb9d0465fff29a7211";
const QWEN_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";

const firebaseConfig = {
  apiKey: "AIzaSyXXXX",
  authDomain: "family-menu-sync.firebaseapp.com",
  databaseURL: "https://family-menu-sync-default-rtdb.firebaseio.com",
  projectId: "family-menu-sync",
  storageBucket: "family-menu-sync.appspot.com"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const cloudRef = db.ref("familyData/v1");

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
  { id: "food_1", name:"米饭", category:"主食", time:20, diff:"简单", cal:"130kcal", pic:foodImgLib["米饭"], desc:"软糯白米饭", ingredients:[{name:"大米",unit:"200g"}], steps:["淘洗","煮饭"] },
  { id: "food_2", name:"面条", category:"主食", time:10, diff:"简单", cal:"110kcal", pic:foodImgLib["面条"], desc:"清水煮面", ingredients:[{name:"面条",unit:"150g"}], steps:["煮水","下面"] },
  { id: "food_3", name:"番茄炒蛋", category:"热菜", time:10, diff:"简单", cal:"150kcal", pic:foodImgLib["番茄炒蛋"], desc:"家常菜", ingredients:[{name:"番茄",unit:"2个"}], steps:["切","炒"] }
];

// ================= FIREBASE =================
function cloudSave(){
  cloudRef.set({
    ...appData,
    lastUpdate: Date.now()
  });
}

cloudRef.on("value", snap => {
  const data = snap.val();
  if (!data) return;
  appData = data;
  renderHome();
  renderMenu();
  updateMine();
});

// ================= INIT =================
function initFoods(){
  if (!appData.allFoods || appData.allFoods.length === 0) {
    appData.allFoods = defaultFoods;
    cloudSave();
  }
}

// ================= CATEGORY =================
function getFoodCategory(name){
  if(/饭|粥|面|包/.test(name)) return "主食";
  if(/汤/.test(name)) return "汤类";
  if(/奶茶|可乐/.test(name)) return "饮料";
  if(/凉/.test(name)) return "凉菜";
  return "热菜";
}

function getFoodAutoImg(name){
  for(let k in foodImgLib){
    if(name.includes(k)) return foodImgLib[k];
  }
  return "https://picsum.photos/600/400?random=" + Math.random();
}

// ================= AI =================
async function aiGenAll(){
  const foodName = document.getElementById("ai-food-name").value.trim();
  if(!foodName) return alert("请输入菜名");

  try{
    const res = await fetch(QWEN_API_URL,{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+QWEN_API_KEY,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:"qwen-turbo",
        input:{
          messages:[{
            role:"user",
            content:`生成菜谱JSON：${foodName}`
          }]
        }
      })
    });

    const data = await res.json();
    let raw = data.output.choices[0].message.content;

    raw = raw.replace(/```json|```/g,"").trim();

    const recipe = JSON.parse(raw);

    document.getElementById("add-name").value = recipe.name || foodName;
    document.getElementById("add-cate").value = getFoodCategory(foodName);
    document.getElementById("add-time").value = recipe.cookTime || 15;
    document.getElementById("add-ing").value = recipe.ingredients || "";
    document.getElementById("add-desc").value = recipe.desc || "家常菜";

    appData.tempSteps = recipe.steps || [];
    appData.tempFoodImage = getFoodAutoImg(foodName);

    alert("AI生成成功");

  }catch(e){
    console.log(e);
    alert("AI失败，已自动填充");
  }
}

// ================= PAGE =================
function goPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+name).classList.add("active");

  const idx = name==="home"?0:name==="menu"?1:2;

  document.querySelectorAll(".tab-item").forEach((t,i)=>{
    t.classList.toggle("active",i===idx);
  });
}

// ================= RENDER =================
function renderHome(){
  const tabs = ["主食","热菜","凉菜","汤类","饮料"];
  const list = (appData.allFoods||[]).filter(f=>f.category===tabs[appData.activeTab]);

  document.getElementById("system-name").innerText = appData.systemName;

  document.getElementById("food-list").innerHTML =
    list.map(f=>`
      <div class="food-card" onclick="openDetail('${f.id}')">
        <img class="food-img" src="${f.pic}">
        <div class="food-info">
          <div class="food-name">${f.name}</div>
        </div>
      </div>
    `).join("");
}

// ================= DETAIL =================
function openDetail(id){
  const food = appData.allFoods.find(f=>f.id===id);
  if(!food) return;

  appData.currentFood = food;

  document.getElementById("detail-name").innerText = food.name;
  document.getElementById("detail-desc").innerText = food.desc;

  document.getElementById("detail-steps").innerHTML =
    (food.steps||[]).map((s,i)=>`<div>${i+1}.${s}</div>`).join("");

  goPage("detail");
}

// ================= MENU =================
function addMenu(){
  if(!appData.currentFood) return alert("请选择菜");

  if(!appData.myMenu.find(x=>x.id===appData.currentFood.id)){
    appData.myMenu.push(appData.currentFood);
  }

  cloudSave();
  alert("已加入菜单");
}

function renderMenu(){
  document.getElementById("menu-list").innerHTML =
    (appData.myMenu||[]).map(f=>`
      <div class="menu-item">
        <span>${f.name}</span>
        <button onclick="delMenu('${f.id}')">删除</button>
      </div>
    `).join("");
}

function delMenu(id){
  appData.myMenu = appData.myMenu.filter(f=>f.id!==id);
  cloudSave();
}

// ================= MINE =================
function updateMine(){
  document.getElementById("mine-name").innerText = appData.systemName;
}

// ================= INIT =================
window.onload = ()=>{
  initFoods();
  renderHome();
  renderMenu();
  updateMine();
};
