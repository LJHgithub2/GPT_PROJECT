let addr="https://port-0-gpt-project-1efqtf2dlratcfa4.sel5.cloudtype.app"
// let addr="http://localhost:3000";

let processLock=false;
var questionList = [];
let lastIndex=-1;
let speakBool=false;
let imgsrc=[
  "/video/wait.mp4",
  "/video/execute.mp4",
];

function fetchStatus() {
  fetch(addr+'/question')
      .then(response => response.json())
      .then(data => {
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
function hendle(audioUrl){
  speak(audioUrl);
}
async function speak(audioUrl) {
  if (!speakBool) {
    console.log("음성듣기를 활성화시켜주세요.");
    await sleep(1000);
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(audioUrl);
      audio.play().then(() => {
        audio.addEventListener('ended', () => {
          resolve(); // 오디오 재생이 완료되면 Promise를 resolve합니다.
        });
      }).catch(e => {
        reject(e); // 오디오 재생 중 에러가 발생하면 Promise를 reject합니다.
      });
    } catch (error) {
      reject(error); // 오디오 객체 생성 중 에러가 발생하면 Promise를 reject합니다.
    }
  });
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
    let result = await response.json();
    
    return {
      answer: result.answer,
      audioUrl: result.audioUrl
    };
  } catch (error) {
    console.error('Error:', error);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function changeVideoSource(newSource) {
  var videoElement = document.getElementById('videoElement');
  var sourceElement = document.getElementById('video_src');
  
  sourceElement.src = imgsrc[newSource];
  videoElement.load(); // 비디오를 새 소스로 로드
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
      var {answer, audioUrl} = await chatgpt(num);
      contentsToggle(answer,text,1);
      await speak(audioUrl);
      contentsToggle("","",2);
      var text=getFirstListItemText();
    }
    processLock=false;
  }
}
function contentsToggle(answer,query,flag){
  var spinner =document.getElementById('spinner');
  if (flag ==0) {
    updateSelectQuestion(query[0],query[1]);
    updateSelectList(query[0],query[1],"처리중");
    document.getElementById('contents').textContent="";
    spinner.style.display = 'block';
  }
  else if(flag == 1) {
    changeVideoSource(1);
    if(speakBool) {
      updateSelectList(query[0],query[1],"음성처리중");
    }
    else updateSelectList(query[0],query[1],"5초간 대기중");
    document.getElementById('contents').textContent=answer;
    spinner.style.display = 'none';
  }
  else if(flag == 2) {
    changeVideoSource(0);
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
  //changeImageSource(0);

  
  const ttsCheckbox = document.getElementById('flexSwitchCheckReverse');
  ttsCheckbox.addEventListener('change', function() {
      speakBool = this.checked; // 체크박스 상태에 따라 speakBool 값 업데이트
      console.log("음성 듣기 상태:", speakBool); // 상태 확인을 위한 콘솔 로그
  });
});
