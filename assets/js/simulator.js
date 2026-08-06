/* ================================================================
   総額シミュレーター
   ★P4/P5/P6: 下記の定数は True Heart の実額確認後に差し替える（現状=たたき）
   ================================================================ */
var PRICE = {           /* 基本料金（税込・円） */
  kasou:     165000,    /* 火葬式 */
  ichinichi: 385000,    /* 一日葬 */
  kazoku:    495000     /* 家族葬（二日葬） */
};
var LABEL = { kasou:"火葬式", ichinichi:"一日葬", kazoku:"家族葬" };
var STAY_PER_DAY = 20000;   /* ご安置＋ドライアイスの延長 1日あたり（要確認） */
/* 基本料金に含まれる安置日数。プランごとに異なる。
   出典: True Heart様パンフレット0526（火葬式=安置1日間/1日葬=2日間/2日葬=3日間）
   ★以前は全プラン一律1日で計算しており、一日葬・家族葬の延長日数を最大2日分過大に見積もっていた */
var INCLUDED_DAYS = {
  kasou:     1,
  ichinichi: 2,
  kazoku:    3
};
var CITY = {                /* 火葬場の使用料・火葬料（要確認） */
  kawasaki: 0,
  yokohama: 12000,
  other:    50000
};
var RANGE_LOW = 0.95, RANGE_HIGH = 1.15;  /* 「約○〜○万円」の幅 */

var state = { plan:"kasou", city:"kawasaki", days:4 };

function yen(n){ return n.toLocaleString("ja-JP") + "円"; }
function man(n){ return (Math.round(n/1000)/10).toFixed(1).replace(/\.0$/,"") + "万円"; }

function render(){
  var base  = PRICE[state.plan];
  var incl  = INCLUDED_DAYS[state.plan];
  var extra = Math.max(0, state.days - incl);
  var stay  = extra * STAY_PER_DAY;
  var city  = CITY[state.city];
  var total = base + stay + city;

  document.getElementById("daysOut").textContent = state.days + "日";
  document.getElementById("incDaysNote").textContent = LABEL[state.plan] + "で" + incl + "日分";
  document.getElementById("brkBase").textContent = yen(base);
  document.getElementById("brkDays").textContent = extra;
  document.getElementById("brkStay").textContent = yen(stay);
  document.getElementById("brkCity").textContent = yen(city);
  document.getElementById("simTotal").dataset.planLabel = LABEL[state.plan];
  document.getElementById("simTotal").textContent =
    "約 " + man(total*RANGE_LOW) + "〜" + man(total*RANGE_HIGH);
}

function bindSeg(id, key){
  var box = document.getElementById(id);
  box.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(!b) return;
    Array.prototype.forEach.call(box.querySelectorAll("button"), function(x){
      x.setAttribute("aria-pressed", String(x === b));
    });
    state[key] = b.dataset[key];
    render();
  });
}
bindSeg("segPlan","plan");
bindSeg("segCity","city");
document.getElementById("days").addEventListener("input", function(e){
  state.days = parseInt(e.target.value, 10);
  render();
});

/* P7: 送信先確定までは実送信しない（テスト状態を維持） */
document.getElementById("contactForm").addEventListener("submit", function(e){
  e.preventDefault();
});
render();
