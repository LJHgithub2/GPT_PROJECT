import pytchat
import pafy
from openai import OpenAI
import requests
from deepdiff import DeepDiff

client = OpenAI(api_key='api키') # OpenAI

api_key = 'api키' # youtube
pafy.set_api_key(api_key)

video_id = 'wFoDcYddTUk'# youtube 동영상 id
url = 'http://localhost:3000/question'
chat = pytchat.create(video_id=video_id)
q_count=0

data_json = {}

# API 엔드포인트
def postData(data):

    # POST 요청
    response = requests.post(url, data=data)
    print(response.text)
    return data
    # 응답 내용 출력

# 서버에 메시지를 /question 엔드포인트로 POST API 요청을 통해 주기적으로 전달합니다.
try:
    while chat.is_alive():
        data = chat.get()
        items = data.items
        for c in items:
            print(f"{c.datetime} [{c.author.name}]- {c.message}")
            json={
                'num' : q_count,
                'name': c.author.name,
                'message': c.message,
            }
            if data_json:
                data_json["num"] = q_count
            if DeepDiff(json, data_json):
                data_json = postData(json)
                q_count = q_count +1

except KeyboardInterrupt:
    chat.terminate()