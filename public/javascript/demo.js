//let addr="https://port-0-gpt-project-1efqtf2dlratcfa4.sel5.cloudtype.app"
let addr="http://localhost:3000";

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
        if (!speakBool) {
          alert("음성듣기를 활성화시켜주세요.");
          return;
        }
          var dataLastIndex= data.list.length - 1;
        var lastIndexNum = dataLastIndex != -1 ? data.list[dataLastIndex].num : lastIndex;

        if (lastIndexNum>lastIndex){
          var diff = lastIndexNum-lastIndex;
          for(var i=data.list.length-diff;i<data.list.length;i++){
            questionList.push(data.list[i]);
            console.log(data.list[i].message);
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
    if(!speakBool) {
      alert("음성버튼을 클릭해주세요");
    }
    while(questionList.length>0){
      var num = questionList[0].num;
      questionList.pop(0);
      var {answer, audioUrl} = await chatgpt(num);
      console.log(answer);
      contentsToggle("","",1);
      await speak(audioUrl);
      contentsToggle("","",2);
    }
    processLock=false;
  }
}
function contentsToggle(answer,query,flag){
  if(flag == 1) {//진행중
    changeVideoSource(1);
  }
  else if(flag == 2) {//끝
    changeVideoSource(0);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // 버튼 요소 가져오기
  setInterval(fetchStatus, 5000);
  // 초기 상태 로드
  fetchStatus();
  //changeImageSource(0);

  
  const button = document.getElementById('btn_sound');
  button.addEventListener('click', function() {
      speakBool = true; // 체크박스 상태에 따라 speakBool 값 업데이트
      console.log("음성 듣기 상태:", speakBool); // 상태 확인을 위한 콘솔 로그
  });
});
