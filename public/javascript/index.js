let addr="http://localhost:3000"
let processLock=false;
var questionList = [];
let lastIndex=-1;
let speakBool=false;
let imgsrc=[
  "image/user.jpg",//user
  "image/jesus.png",//jesus
  "image/spinner.gif"//spinner
];

function fetchStatus() {
  fetch(addr+'/question')
      .then(response => response.json())
      .then(data => {
        console.log(data.list, data.lastIndex);
        if (lastIndex === -1 && data.lastIndex != -1){
          lastIndex = data.lastIndex;
          return;
        }
        var dataLastIndex= data.list.length - 1;
        var lastIndexNum = dataLastIndex != -1 ? data.list[dataLastIndex].num : lastIndex;

        if (lastIndexNum>lastIndex){
          var diff = lastIndexNum-lastIndex;
          for(var i=data.list.length-diff;i<data.list.length;i++){
            addListItem(`${data.list[i].name} : ${data.list[i].message}`);
            questionList.push(data.list[i]);
            lastIndex+=1;
          }
          processQ();
        }
      })
      .catch(error => console.error('Error:', error));
}
async function speak(text) {
  if (speakBool){
    var msg = new SpeechSynthesisUtterance();
    var textArea = text; // 텍스트 설정
    msg.text = textArea;
    window.speechSynthesis.speak(msg);
    return new Promise(resolve => {
      msg.onend = resolve;
    });
  }
  else {
    await sleep(5000);
  }
}

async function handleClick(text) {
  console.log('start');
  await speak(text);
  console.log('stop');
}

function addListItem(text) {
  // 새로운 <li> 요소 생성
  var newListItem = document.createElement('li');
  newListItem.className = 'list-group-item'; // 클래스 설정
  newListItem.textContent = text; // 매개변수로 받은 텍스트 설정

  // <ol> 리스트에 새로운 <li> 요소 추가
  var list = document.getElementById('list');
  list.appendChild(newListItem);
}

function getFirstListItemText() {
  // <ol> 요소를 ID를 사용하여 찾기
  var olElement = document.getElementById("list");

  // <ol> 요소가 존재하고, 적어도 하나의 <li> 자식 요소가 있는지 확인
  if (olElement && olElement.children.length > 2) {
      // 첫 번째 <li> 요소의 텍스트 반환
      return olElement.children[2].textContent;
  } else {
      // <ol> 요소가 없거나 <li> 요소가 없는 경우
      return false;
  }
}

function removeFirstListItem() {
  // <ol> 또는 <ul> 요소 가져오기
  var list = document.getElementById('list');

  // 리스트의 첫 번째 <li> 요소 가져오기
  var firstListItem = list.children[2];

  // 첫 번째 요소가 존재하면 삭제
  if (firstListItem) {
      list.removeChild(firstListItem);
  }
}

function updateSelectList(name, question, BadgeText) {
  // 'fw-bold' 클래스를 가진 요소 찾기
  var questionElement = document.getElementById('processQ_name');
  if (questionElement) {
      questionElement.textContent = name;

      // 'fw-bold' 요소의 다음 형제 텍스트 노드 찾기 및 업데이트
      var nextSibling = questionElement.nextSibling;
      if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
          nextSibling.nodeValue = question;
      }
  }

  // 'badge' 클래스를 가진 요소 찾기
  var badgeElement = document.getElementById('processBadge');
  if (badgeElement) {
      badgeElement.textContent = BadgeText;
  }
}

function updateSelectQuestion(name, question) {
  // 요소 가져오기
  var nameSpan = document.getElementById('questionName');
  var questionSpan = document.getElementById('query');


  if (nameSpan && questionSpan) {
      nameSpan.textContent = name;
      questionSpan.textContent = question;
  }
}

async function chatgpt(num){
  try {
    let response = await fetch(addr + '/ask/' + num);
    let data = await response.text();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function changeImageSource(srcNumber) {
  var imageElement = document.querySelector('.img-fluid'); // 이미지 요소 선택
  imageElement.src = imgsrc[srcNumber]; // 새로운 소스로 'src' 속성 변경
}

async function processQ(){
  if (!processLock){
    processLock=true;
    var text=getFirstListItemText();
    while(text){
      text=text.split(":");
      var num = questionList[0].num;
      contentsToggle("",text,0);
      removeFirstListItem();
      questionList.pop(0);
      var answer = await chatgpt(num);
      contentsToggle(answer,text,1);
      await handleClick(answer);
      contentsToggle("","",2);
      var text=getFirstListItemText();
    }
    processLock=false;
  }
}
function contentsToggle(answer,query,flag){
  var spinner =document.getElementById('spinner');
  if (flag ==0) {
    changeImageSource(2);
    updateSelectQuestion(query[0],query[1]);
    updateSelectList(query[0],query[1],"처리중");
    document.getElementById('contents').textContent="";
    spinner.style.display = 'block';
  }
  else if(flag == 1) {
    changeImageSource(1);
    if(speakBool) updateSelectList(query[0],query[1],"음성처리중");
    else updateSelectList(query[0],query[1],"5초간 대기중");
    document.getElementById('contents').textContent=answer;
    spinner.style.display = 'none';
  }
  else if(flag == 2) {
    changeImageSource(0);
    updateSelectList("질문없음","-","대기중");
    updateSelectQuestion("질문자","-");
    document.getElementById('contents').textContent="질문 대기중";
    spinner.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // 버튼 요소 가져오기
  setInterval(fetchStatus, 5000);
  // 초기 상태 로드
  fetchStatus();
  changeImageSource(0);

  
  const ttsCheckbox = document.getElementById('flexSwitchCheckReverse');
  ttsCheckbox.addEventListener('change', function() {
      speakBool = this.checked; // 체크박스 상태에 따라 speakBool 값 업데이트
      console.log("음성 듣기 상태:", speakBool); // 상태 확인을 위한 콘솔 로그
  });
});
