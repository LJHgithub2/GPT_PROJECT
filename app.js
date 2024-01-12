import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { fileURLToPath } from "url"; 
import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});


const __dirname = fileURLToPath(new URL(".", import.meta.url)); 
const __filename = fileURLToPath(import.meta.url); 
const app = express();
const port = process.env.PORT || 3000;
var question={"list":[]};
var getQuestionList={"list":[],"lastIndex":-1};
const requestQueue = [];
var questionNum=0;

// Use path.join for the static middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.urlencoded({
    extended: true
}));


app.get('/', (req, res) => {
    // Use path.join to create the correct absolute file path
    const indexPath = path.join(__dirname, 'public', 'view', 'index.html');
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

app.get('/ask/:num',async (req, res) => {
    const num = parseInt(req.params.num);
    if (requestQueue.length > 0) {
        requestQueue.push({ num, res });
    } else {
        requestQueue.push({ num, res });
        processQueue();
    }
});

app.post('/question',async (req, res) => {
    question.list.push({"num":questionNum,"name":req.body.name,"message":req.body.message,"answer":""});
    getQuestionList.list.push({"num":questionNum,"name":req.body.name,"message":req.body.message,"answer":""});
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
                question.list[num].answer = answer;
                getQuestionList.lastIndex=num;
            }
            res.send(question.list[num].answer);
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
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "너는 한국말은 하는 예수님이야" },
                { role: "system", content: "예수님 말투로 대답해줘" },
                { role: "system", content: "답변을 줄때 성경의 구절을 인용해서 답변해줘" },
                { role: "system", content: "~했어, ~줄게, ~줘 처럼 친근한 어투가 아닌 무조건 ~하노라, ~일지어라, ~하리라 같은 예수님 말투를 써서 답변해" },
                { role: 'user', content:text}
            ],
            model: "gpt-3.5-turbo",
        });
        // 대화 내용만 출력
        return completion.choices[0].message.content;
    } catch (error) {
        // 오류 처리
        console.error("Error:", error);
        return false;
    }
}
