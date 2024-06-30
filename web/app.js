import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from "url"; 
import OpenAI from "openai";
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
dotenv.config();

const API_TOKEN = process.env.TYPECAST_API_KEY; // 여기에 실제 API 토큰을 입력하세요
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});


const __dirname = fileURLToPath(new URL(".", import.meta.url)); 
const __filename = fileURLToPath(import.meta.url); 
const app = express();
const port = process.env.PORT || 3000;
var question={"list":[]};
var getQuestionList={"list":[],"lastIndex":-1};
const requestQueue = [];
var questionNum=0;
var audioNum=0;

// Use path.join for the static middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: true
}));
app.use('/static', express.static('public')); // 'public' 폴더를 정적 파일로 제공

app.get('/', (req, res) => {
    // Use path.join to create the correct absolute file path
    const indexPath = path.join(__dirname, 'public', 'view', 'index.html');
    res.sendFile(indexPath);
});
app.get('/demo', (req, res) => {
    // Use path.join to create the correct absolute file path
    const indexPath = path.join(__dirname, 'public', 'view', 'demo.html');
    res.sendFile(indexPath);
});
app.get('/question', (req, res) => {
    // Use path.join to create the correct absolute file path
    try {
        res.json(getQuestionList);
    }catch (error) {
        res.status(500).send("An error occurred"); // 오류 처리
    }
});

app.get('/ask/:num',(req, res) => {
    const num = parseInt(req.params.num);
    if (requestQueue.length > 0) {
        requestQueue.push({ num, res });
    } else {
        requestQueue.push({ num, res });
        processQueue();
    }
});

app.post('/question',(req, res) => {
    question.list.push({"num":questionNum,"name":req.body.name,"message":req.body.message,"answer":"", "audioUrl":""});
    getQuestionList.list.push({"num":questionNum,"name":req.body.name,"message":req.body.message,"answer":"", "audioUrl":""});
    questionNum+=1;
    console.log(`${questionNum-1}.${req.body.name}:${req.body.message}`);
    res.send(`${questionNum-1}.${req.body.name}:${req.body.message}`);
});

app.listen(port, () => {
    console.log(`Server is listening at localhost:${port}`);
});


async function processQueue() {
    while (requestQueue.length > 0) {
        const { num, res } = requestQueue[0];
        try {
            if (question.list[num].answer.length <= 0) {
                const answer = await gptAPI(question.list[num].message);
                const audioFileUrl = await fetchAudio(answer[0],answer[1]);
               
                question.list[num].answer = answer[0];
                question.list[num].audioUrl = audioFileUrl;
                getQuestionList.lastIndex=num;
            }
            res.json({ 
                answer: question.list[num].answer, 
                audioUrl: question.list[num].audioUrl 
            });
        } catch (error) {
            console.error("An error occurred", error);
            res.status(500).send("An error occurred. Please check the server logs for details.");
        } finally {
            requestQueue.shift(); // 큐에서 첫 번째 요소를 제거
        }
    }
}
async function gptAPI(text) {
    try {
        console.log("gpt 시작");
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "너는 한국말은 하는 예수님이야" },
                { role: "system", content: "예수님 말투로 대답해줘" },
                { role: "system", content: "답변을 줄때 성경의 구절을 인용해서 답변해줘" },
                { role: "system", content: "~했어, ~줄게, ~줘 처럼 친근한 어투가 아닌 무조건 ~하노라, ~일지어라, ~하리라 같은 예수님 말투를 써서 답변해" },
                { role: "system", content: "답변의 450토큰이 되도록 답변의 길이를 조절해서 답변을 마무리를 잘해줘" },
                { role: "system", content: "답변이 중간에 끊키지 않도록 분량 조절을 잘해줘" },
                { role: 'user', content:text}
            ],
            model: "gpt-3.5-turbo",
            max_tokens: 450,
        });
        // 대화 내용만 출력
        console.log(completion.choices[0].message.content);
        console.log(completion['usage']['total_tokens']);
        console.log("gpt 끝");
        return [completion.choices[0].message.content,completion['usage']['total_tokens']];
    } catch (error) {
        // 오류 처리
        console.error("Error:", error);
        return false;
    }
}
async function fetchAudio(text, tokenCount) {
    try {
        console.log("tts 시작");
        const FILE_NAME = "./public/audio/tempAudio"+ audioNum +".mp3"; // 여기에 저장할 파일 이름을 입력하세요
        audioNum++;
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_TOKEN}`
        };
        // 음성 합성 요청
        const body = {
            text: text,
            lang: 'auto',
            actor_id: '6386d6c8e47053047c6af4c5', // 여기에 사용할 actor_id를 입력하세요
            xapi_hd: true,
            model_version: 'latest',
            max_seconds: 60
        };
        
        // tokenCount가 400을 초과하는 경우에만 force_length 속성 추가
        if (tokenCount > 600) {
            body.force_length = "1";
        }
        const response = await axios.post('https://typecast.ai/api/speak', body, { headers });


        // 음성 합성 결과 확인
        while(true){
            const resultResponse = await axios.get(response.data.result.speak_v2_url, { headers });
            
            const result = resultResponse.data.result;

            if (result.status === 'done' && result.audio_download_url) {
                const audioResponse = await axios.get(result.audio_download_url, { responseType: 'stream', headers });
                const url = await downloadAudioAndReturnPath(audioResponse,FILE_NAME);
                return url;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function downloadAudioAndReturnPath(audioResponse, fileName) {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(fileName);
        let downloaded = 0;
        const totalSize = parseInt(audioResponse.headers['content-length']);

        audioResponse.data.pipe(writer);

        
        audioResponse.data.on('data', (chunk) => {
            downloaded += chunk.length;
            //console.log(`다운로드 진행: ${downloaded} / ${totalSize} (${((downloaded / totalSize) * 100).toFixed(2)}%)`);
        });

        writer.on('finish', async() => {
            console.log("TTS 끝");
            resolve("./audio/tempAudio" + (audioNum - 1) + ".mp3");
        });

        writer.on('error', (error) => {
            console.error("파일 다운로드 중 오류 발생:", error);
            reject(error);
        });
    });
}