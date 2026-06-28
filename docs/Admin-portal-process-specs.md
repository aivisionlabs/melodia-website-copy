On creation of the song we need to make an api call

curl --request POST \
  --url https://api.sunoapi.org/api/v1/generate \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "prompt": "A calm and relaxing piano track with soft melodies",
  "style": "Classical",
  "title": "Peaceful Piano Meditation",
  "customMode": true,
  "instrumental": true,
  "model": "V3_5",
  "negativeTags": "Heavy Metal, Upbeat Drums",
  "callBackUrl": "https://api.example.com/callback"
}'

here, mapping exists as:

titile: <Song title>,
customMode: true,
instrumental: false,
model: "V5_5",
negativeTags: <negativeTags>,
prompt: <lyrics>,
 style: <music_style>,
callbakcUrl: <dummy_callback_url>

In the form add another field for negativeTags and keep it optional,
Also keep category and tags fields optional.

We also need to define a publically created endpoint for handling callback

Once we recieve the response from this api we should get a success response as
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}

Here we need to extract taskId from the response.

Each song will have 2 variants, We need to display both the variants to the user along with the lyrics. Which should be coming in the prompt field.

While user is waiting for the song production to happen we need to take user to another screen which says Song Generation in progress, It will take 30-40 seconds to start song generation and show a progress bar.

While user is waiting on the page we need to poll an api

curl --request GET \
  --url https://api.sunoapi.org/api/v1/generate/record-info?taskId=<taskId> \
  --header 'Authorization: Bearer <token>'

Response:
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e",
    "parentMusicId": "",
    "param": "{\"prompt\":\"A calm piano track\",\"style\":\"Classical\",\"title\":\"Peaceful Piano\",\"customMode\":true,\"instrumental\":true,\"model\":\"V3_5\"}",
    "response": {
      "taskId": "5c79****be8e",
      "sunoData": [
        {
          "id": "8551****662c",
          "audioUrl": "https://example.cn/****.mp3",
          "streamAudioUrl": "https://example.cn/****",
          "imageUrl": "https://example.cn/****.jpeg",
          "prompt": "[Verse] 夜晚城市 灯火辉煌",
          "modelName": "chirp-v3-5",
          "title": "钢铁侠",
          "tags": "electrifying, rock",
          "createTime": "2025-01-01 00:00:00",
          "duration": 198.44
        }
      ]
    },
    "status": "SUCCESS",
    "type": "GENERATE",
    "errorCode": null,
    "errorMessage": null
  }
}

In the sunoData it will have 2 array data sets.

These are the various status available for this api

PENDING: Task is waiting to be processed
TEXT_SUCCESS: Lyrics/text generation completed successfully
FIRST_SUCCESS: First track generation completed successfully
SUCCESS: All tracks generated successfully
CREATE_TASK_FAILED: Failed to create the generation task
GENERATE_AUDIO_FAILED: Failed to generate music tracks
CALLBACK_EXCEPTION: Error occurred during callback
SENSITIVE_WORD_ERROR: Content contains prohibited words

While waiting on the page to generate the song we need to keep polling record-info api and as soon as `streamAudioUrl` is available in the response we need to allow user to play the song and view the lyrics in the bottom. In this page the lyrics will not be synchornized.

Once `streamAudioUrl` for both the songs is available show 2 options by title and image for user to choose from.


At any point of time any of the failed task status is produced then we need to show an error in the form of toast with correct error message and description.