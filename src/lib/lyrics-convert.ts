// import { convertAlignWordsFormatForLyricsProcessing, convertToLyricLines } from "./lyrics-processing-util";

// const alignedWords = [
//   {
//     "endS": 24.70213,
//     "word": "(Verse 1)\n",
//     "palign": 0,
//     "startS": 24.57447,
//     "success": true
//   },
//   {
//     "endS": 24.73404,
//     "word": "जब ",
//     "palign": 0,
//     "startS": 24.71809,
//     "success": true
//   },
//   {
//     "endS": 25.0133,
//     "word": "से ",
//     "palign": 0,
//     "startS": 24.89362,
//     "success": true
//   },
//   {
//     "endS": 25.05319,
//     "word": "तु",
//     "palign": 0,
//     "startS": 25.05319,
//     "success": true
//   },
//   {
//     "endS": 26.17021,
//     "word": "म ",
//     "palign": 0,
//     "startS": 25.21277,
//     "success": true
//   },
//   {
//     "endS": 26.40957,
//     "word": "मे",
//     "palign": 0,
//     "startS": 26.32979,
//     "success": true
//   },
//   {
//     "endS": 26.75532,
//     "word": "री ",
//     "palign": 0,
//     "startS": 26.56915,
//     "success": true
//   },
//   {
//     "endS": 27.08777,
//     "word": "ज़िं",
//     "palign": 0,
//     "startS": 26.8617,
//     "success": true
//   },
//   {
//     "endS": 27.88564,
//     "word": "दगी ",
//     "palign": 0,
//     "startS": 27.20745,
//     "success": true
//   },
//   {
//     "endS": 28.37766,
//     "word": "में ",
//     "palign": 0,
//     "startS": 28.00532,
//     "success": true
//   },
//   {
//     "endS": 29.20213,
//     "word": "आई ",
//     "palign": 0,
//     "startS": 28.48404,
//     "success": true
//   },
//   {
//     "endS": 30.47872,
//     "word": "हो\n",
//     "palign": 0,
//     "startS": 29.3617,
//     "success": true
//   },
//   {
//     "endS": 30.79787,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 30.55851,
//     "success": true
//   },
//   {
//     "endS": 31.19681,
//     "word": "पल ",
//     "palign": 0,
//     "startS": 30.95745,
//     "success": true
//   },
//   {
//     "endS": 32.84574,
//     "word": "में ",
//     "palign": 0,
//     "startS": 31.35638,
//     "success": true
//   },
//   {
//     "endS": 32.95213,
//     "word": "खु",
//     "palign": 0,
//     "startS": 32.95213,
//     "success": true
//   },
//   {
//     "endS": 33.94947,
//     "word": "शबू ",
//     "palign": 0,
//     "startS": 33.1117,
//     "success": true
//   },
//   {
//     "endS": 34.3484,
//     "word": "सी ",
//     "palign": 0,
//     "startS": 34.06915,
//     "success": true
//   },
//   {
//     "endS": 34.70745,
//     "word": "ला",
//     "palign": 0,
//     "startS": 34.46809,
//     "success": true
//   },
//   {
//     "endS": 35.26596,
//     "word": "ई ",
//     "palign": 0,
//     "startS": 34.86702,
//     "success": true
//   },
//   {
//     "endS": 36.50266,
//     "word": "हो\n",
//     "palign": 0,
//     "startS": 35.42553,
//     "success": true
//   },
//   {
//     "endS": 36.62234,
//     "word": "ते",
//     "palign": 0,
//     "startS": 36.62234,
//     "success": true
//   },
//   {
//     "endS": 36.98138,
//     "word": "री ",
//     "palign": 0,
//     "startS": 36.78191,
//     "success": true
//   },
//   {
//     "endS": 37.10106,
//     "word": "हँ",
//     "palign": 0,
//     "startS": 37.10106,
//     "success": true
//   },
//   {
//     "endS": 38.49734,
//     "word": "सी ",
//     "palign": 0,
//     "startS": 37.26064,
//     "success": true
//   },
//   {
//     "endS": 38.81649,
//     "word": "से ",
//     "palign": 0,
//     "startS": 38.61702,
//     "success": true
//   },
//   {
//     "endS": 39.09574,
//     "word": "रो",
//     "palign": 0,
//     "startS": 38.93617,
//     "success": true
//   },
//   {
//     "endS": 39.49468,
//     "word": "शन ",
//     "palign": 0,
//     "startS": 39.25532,
//     "success": true
//   },
//   {
//     "endS": 40.41223,
//     "word": "है ",
//     "palign": 0,
//     "startS": 39.65426,
//     "success": true
//   },
//   {
//     "endS": 40.85106,
//     "word": "मे",
//     "palign": 0,
//     "startS": 40.53191,
//     "success": true
//   },
//   {
//     "endS": 41.44947,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 41.01064,
//     "success": true
//   },
//   {
//     "endS": 42.95213,
//     "word": "जहाँ\n",
//     "palign": 0,
//     "startS": 41.56915,
//     "success": true
//   },
//   {
//     "endS": 43.00532,
//     "word": "तु",
//     "palign": 0,
//     "startS": 43.00532,
//     "success": true
//   },
//   {
//     "endS": 43.24468,
//     "word": "म ",
//     "palign": 0,
//     "startS": 43.16489,
//     "success": true
//   },
//   {
//     "endS": 43.7633,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 43.40426,
//     "success": true
//   },
//   {
//     "endS": 44.00266,
//     "word": "तो ",
//     "palign": 0,
//     "startS": 43.88298,
//     "success": true
//   },
//   {
//     "endS": 44.96011,
//     "word": "हो ",
//     "palign": 0,
//     "startS": 44.12234,
//     "success": true
//   },
//   {
//     "endS": 45.07979,
//     "word": "मे",
//     "palign": 0,
//     "startS": 45.07979,
//     "success": true
//   },
//   {
//     "endS": 45.43883,
//     "word": "री ",
//     "palign": 0,
//     "startS": 45.23936,
//     "success": true
//   },
//   {
//     "endS": 45.87766,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 45.55851,
//     "success": true
//   },
//   {
//     "endS": 46.11702,
//     "word": "दु",
//     "palign": 0,
//     "startS": 46.03723,
//     "success": true
//   },
//   {
//     "endS": 46.5359,
//     "word": "आ\n\n(",
//     "palign": 0,
//     "startS": 46.2766,
//     "success": true
//   },
//   {
//     "endS": 48.67021,
//     "word": "Chorus)\n",
//     "palign": 0,
//     "startS": 46.62566,
//     "success": true
//   },
//   {
//     "endS": 48.75,
//     "word": "मे",
//     "palign": 0,
//     "startS": 48.75,
//     "success": true
//   },
//   {
//     "endS": 49.10904,
//     "word": "री ",
//     "palign": 0,
//     "startS": 48.90957,
//     "success": true
//   },
//   {
//     "endS": 49.22872,
//     "word": "दि",
//     "palign": 0,
//     "startS": 49.22872,
//     "success": true
//   },
//   {
//     "endS": 49.3883,
//     "word": "व्",
//     "palign": 0,
//     "startS": 49.3883,
//     "success": true
//   },
//   {
//     "endS": 50.18617,
//     "word": "या, ",
//     "palign": 0,
//     "startS": 49.50798,
//     "success": true
//   },
//   {
//     "endS": 50.26596,
//     "word": "मे",
//     "palign": 0,
//     "startS": 50.26596,
//     "success": true
//   },
//   {
//     "endS": 50.54521,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 50.42553,
//     "success": true
//   },
//   {
//     "endS": 50.58511,
//     "word": "प्",
//     "palign": 0,
//     "startS": 50.58511,
//     "success": true
//   },
//   {
//     "endS": 50.66489,
//     "word": "या",
//     "palign": 0,
//     "startS": 50.66489,
//     "success": true
//   },
//   {
//     "endS": 51.10372,
//     "word": "र, ",
//     "palign": 0,
//     "startS": 50.82447,
//     "success": true
//   },
//   {
//     "endS": 52.18085,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 51.2234,
//     "success": true
//   },
//   {
//     "endS": 52.65957,
//     "word": "मे",
//     "palign": 0,
//     "startS": 52.42021,
//     "success": true
//   },
//   {
//     "endS": 53.17819,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 52.81915,
//     "success": true
//   },
//   {
//     "endS": 53.29787,
//     "word": "सं",
//     "palign": 0,
//     "startS": 53.29787,
//     "success": true
//   },
//   {
//     "endS": 53.45745,
//     "word": "सा",
//     "palign": 0,
//     "startS": 53.45745,
//     "success": true
//   },
//   {
//     "endS": 53.61702,
//     "word": "र\n",
//     "palign": 0,
//     "startS": 53.61702,
//     "success": true
//   },
//   {
//     "endS": 55.05319,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 53.7766,
//     "success": true
//   },
//   {
//     "endS": 55.45213,
//     "word": "साँ",
//     "palign": 0,
//     "startS": 55.17287,
//     "success": true
//   },
//   {
//     "endS": 56.09043,
//     "word": "स ",
//     "palign": 0,
//     "startS": 55.6117,
//     "success": true
//   },
//   {
//     "endS": 56.56915,
//     "word": "में ",
//     "palign": 0,
//     "startS": 56.19681,
//     "success": true
//   },
//   {
//     "endS": 57.04787,
//     "word": "बस ",
//     "palign": 0,
//     "startS": 56.72872,
//     "success": true
//   },
//   {
//     "endS": 57.36702,
//     "word": "ते",
//     "palign": 0,
//     "startS": 57.20745,
//     "success": true
//   },
//   {
//     "endS": 57.64628,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 57.5266,
//     "success": true
//   },
//   {
//     "endS": 57.88564,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 57.76596,
//     "success": true
//   },
//   {
//     "endS": 58.08511,
//     "word": "इं",
//     "palign": 0,
//     "startS": 58.00532,
//     "success": true
//   },
//   {
//     "endS": 58.56383,
//     "word": "तज़ा",
//     "palign": 0,
//     "startS": 58.24468,
//     "success": true
//   },
//   {
//     "endS": 60.71809,
//     "word": "र\n",
//     "palign": 0,
//     "startS": 58.7234,
//     "success": true
//   },
//   {
//     "endS": 60.91755,
//     "word": "ते",
//     "palign": 0,
//     "startS": 60.81782,
//     "success": true
//   },
//   {
//     "endS": 61.19681,
//     "word": "रे ",
//     "palign": 0,
//     "startS": 61.01729,
//     "success": true
//   },
//   {
//     "endS": 61.35638,
//     "word": "बि",
//     "palign": 0,
//     "startS": 61.35638,
//     "success": true
//   },
//   {
//     "endS": 61.99468,
//     "word": "ना ",
//     "palign": 0,
//     "startS": 61.51596,
//     "success": true
//   },
//   {
//     "endS": 62.31383,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 62.07447,
//     "success": true
//   },
//   {
//     "endS": 62.75266,
//     "word": "पल ",
//     "palign": 0,
//     "startS": 62.4734,
//     "success": true
//   },
//   {
//     "endS": 63.1516,
//     "word": "है ",
//     "palign": 0,
//     "startS": 62.87234,
//     "success": true
//   },
//   {
//     "endS": 63.43085,
//     "word": "सू",
//     "palign": 0,
//     "startS": 63.27128,
//     "success": true
//   },
//   {
//     "endS": 64.26862,
//     "word": "ना\n",
//     "palign": 0,
//     "startS": 63.59043,
//     "success": true
//   },
//   {
//     "endS": 64.58777,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 64.3883,
//     "success": true
//   },
//   {
//     "endS": 64.74734,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 64.70745,
//     "success": true
//   },
//   {
//     "endS": 64.94681,
//     "word": "तो ",
//     "palign": 0,
//     "startS": 64.78723,
//     "success": true
//   },
//   {
//     "endS": 65.34574,
//     "word": "है ",
//     "palign": 0,
//     "startS": 65.10638,
//     "success": true
//   },
//   {
//     "endS": 65.50532,
//     "word": "मे",
//     "palign": 0,
//     "startS": 65.42553,
//     "success": true
//   },
//   {
//     "endS": 65.66489,
//     "word": "री ",
//     "palign": 0,
//     "startS": 65.58511,
//     "success": true
//   },
//   {
//     "endS": 65.90426,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 65.82447,
//     "success": true
//   },
//   {
//     "endS": 84.33511,
//     "word": "तमन्",
//     "palign": 0,
//     "startS": 66.06383,
//     "success": true
//   },
//   {
//     "endS": 84.53457,
//     "word": "ना\n\n(",
//     "palign": 0,
//     "startS": 84.375,
//     "success": true
//   },
//   {
//     "endS": 84.85372,
//     "word": "Verse 2)\n",
//     "palign": 0,
//     "startS": 84.57447,
//     "success": true
//   },
//   {
//     "endS": 84.89362,
//     "word": "ते",
//     "palign": 0,
//     "startS": 84.89362,
//     "success": true
//   },
//   {
//     "endS": 85.17287,
//     "word": "री ",
//     "palign": 0,
//     "startS": 85.05319,
//     "success": true
//   },
//   {
//     "endS": 85.45213,
//     "word": "आँ",
//     "palign": 0,
//     "startS": 85.29255,
//     "success": true
//   },
//   {
//     "endS": 86.06383,
//     "word": "खों ",
//     "palign": 0,
//     "startS": 85.6117,
//     "success": true
//   },
//   {
//     "endS": 87.26064,
//     "word": "में ",
//     "palign": 0,
//     "startS": 86.17021,
//     "success": true
//   },
//   {
//     "endS": 87.36702,
//     "word": "दे",
//     "palign": 0,
//     "startS": 87.36702,
//     "success": true
//   },
//   {
//     "endS": 87.88564,
//     "word": "खा ",
//     "palign": 0,
//     "startS": 87.5266,
//     "success": true
//   },
//   {
//     "endS": 88.28457,
//     "word": "है ",
//     "palign": 0,
//     "startS": 88.00532,
//     "success": true
//   },
//   {
//     "endS": 88.60372,
//     "word": "मैं",
//     "palign": 0,
//     "startS": 88.40426,
//     "success": true
//   },
//   {
//     "endS": 88.96277,
//     "word": "ने ",
//     "palign": 0,
//     "startS": 88.7234,
//     "success": true
//   },
//   {
//     "endS": 90.07979,
//     "word": "अपना ",
//     "palign": 0,
//     "startS": 89.04255,
//     "success": true
//   },
//   {
//     "endS": 91.19681,
//     "word": "कल\n",
//     "palign": 0,
//     "startS": 90.15957,
//     "success": true
//   },
//   {
//     "endS": 91.51596,
//     "word": "ते",
//     "palign": 0,
//     "startS": 91.35638,
//     "success": true
//   },
//   {
//     "endS": 92.03457,
//     "word": "रे ",
//     "palign": 0,
//     "startS": 91.67553,
//     "success": true
//   },
//   {
//     "endS": 92.4734,
//     "word": "सा",
//     "palign": 0,
//     "startS": 92.15426,
//     "success": true
//   },
//   {
//     "endS": 92.71277,
//     "word": "थ ",
//     "palign": 0,
//     "startS": 92.63298,
//     "success": true
//   },
//   {
//     "endS": 93.1516,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 92.87234,
//     "success": true
//   },
//   {
//     "endS": 94.22872,
//     "word": "है ",
//     "palign": 0,
//     "startS": 93.27128,
//     "success": true
//   },
//   {
//     "endS": 94.54787,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 94.30851,
//     "success": true
//   },
//   {
//     "endS": 94.70745,
//     "word": "मु",
//     "palign": 0,
//     "startS": 94.70745,
//     "success": true
//   },
//   {
//     "endS": 94.94681,
//     "word": "श्",
//     "palign": 0,
//     "startS": 94.86702,
//     "success": true
//   },
//   {
//     "endS": 95.0266,
//     "word": "कि",
//     "palign": 0,
//     "startS": 95.0266,
//     "success": true
//   },
//   {
//     "endS": 95.34574,
//     "word": "ल ",
//     "palign": 0,
//     "startS": 95.18617,
//     "success": true
//   },
//   {
//     "endS": 96.14362,
//     "word": "का ",
//     "palign": 0,
//     "startS": 95.50532,
//     "success": true
//   },
//   {
//     "endS": 97.57979,
//     "word": "हल\n",
//     "palign": 0,
//     "startS": 96.2234,
//     "success": true
//   },
//   {
//     "endS": 97.89894,
//     "word": "हा",
//     "palign": 0,
//     "startS": 97.73936,
//     "success": true
//   },
//   {
//     "endS": 98.51064,
//     "word": "थों ",
//     "palign": 0,
//     "startS": 98.05851,
//     "success": true
//   },
//   {
//     "endS": 98.82979,
//     "word": "में ",
//     "palign": 0,
//     "startS": 98.61702,
//     "success": true
//   },
//   {
//     "endS": 98.93617,
//     "word": "ते",
//     "palign": 0,
//     "startS": 98.93617,
//     "success": true
//   },
//   {
//     "endS": 99.375,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 99.09574,
//     "success": true
//   },
//   {
//     "endS": 99.49468,
//     "word": "हा",
//     "palign": 0,
//     "startS": 99.49468,
//     "success": true
//   },
//   {
//     "endS": 100.73138,
//     "word": "थ, ",
//     "palign": 0,
//     "startS": 99.65426,
//     "success": true
//   },
//   {
//     "endS": 101.13032,
//     "word": "ये ",
//     "palign": 0,
//     "startS": 100.85106,
//     "success": true
//   },
//   {
//     "endS": 101.32979,
//     "word": "वा",
//     "palign": 0,
//     "startS": 101.25,
//     "success": true
//   },
//   {
//     "endS": 101.76862,
//     "word": "दा ",
//     "palign": 0,
//     "startS": 101.48936,
//     "success": true
//   },
//   {
//     "endS": 102.08777,
//     "word": "है ",
//     "palign": 0,
//     "startS": 101.8883,
//     "success": true
//   },
//   {
//     "endS": 102.28723,
//     "word": "मे",
//     "palign": 0,
//     "startS": 102.20745,
//     "success": true
//   },
//   {
//     "endS": 103.64362,
//     "word": "रा\n",
//     "palign": 0,
//     "startS": 102.44681,
//     "success": true
//   },
//   {
//     "endS": 103.88298,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 103.7234,
//     "success": true
//   },
//   {
//     "endS": 104.44149,
//     "word": "जनम ",
//     "palign": 0,
//     "startS": 104.04255,
//     "success": true
//   },
//   {
//     "endS": 104.86702,
//     "word": "में ",
//     "palign": 0,
//     "startS": 104.60106,
//     "success": true
//   },
//   {
//     "endS": 105.55851,
//     "word": "बस ",
//     "palign": 0,
//     "startS": 104.92021,
//     "success": true
//   },
//   {
//     "endS": 105.99734,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 105.71809,
//     "success": true
//   },
//   {
//     "endS": 106.2367,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 106.11702,
//     "success": true
//   },
//   {
//     "endS": 106.43617,
//     "word": "सा",
//     "palign": 0,
//     "startS": 106.35638,
//     "success": true
//   },
//   {
//     "endS": 106.75532,
//     "word": "थ ",
//     "palign": 0,
//     "startS": 106.59574,
//     "success": true
//   },
//   {
//     "endS": 107.07447,
//     "word": "मे",
//     "palign": 0,
//     "startS": 106.91489,
//     "success": true
//   },
//   {
//     "endS": 107.42021,
//     "word": "रा\n\n(",
//     "palign": 0,
//     "startS": 107.15426,
//     "success": true
//   },
//   {
//     "endS": 109.46809,
//     "word": "Chorus)\n",
//     "palign": 0,
//     "startS": 107.50887,
//     "success": true
//   },
//   {
//     "endS": 109.54787,
//     "word": "मे",
//     "palign": 0,
//     "startS": 109.54787,
//     "success": true
//   },
//   {
//     "endS": 109.82713,
//     "word": "री ",
//     "palign": 0,
//     "startS": 109.70745,
//     "success": true
//   },
//   {
//     "endS": 109.94681,
//     "word": "दि",
//     "palign": 0,
//     "startS": 109.94681,
//     "success": true
//   },
//   {
//     "endS": 110.10638,
//     "word": "व्",
//     "palign": 0,
//     "startS": 110.10638,
//     "success": true
//   },
//   {
//     "endS": 110.94415,
//     "word": "या, ",
//     "palign": 0,
//     "startS": 110.22606,
//     "success": true
//   },
//   {
//     "endS": 110.98404,
//     "word": "मे",
//     "palign": 0,
//     "startS": 110.98404,
//     "success": true
//   },
//   {
//     "endS": 111.2234,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 111.14362,
//     "success": true
//   },
//   {
//     "endS": 111.30319,
//     "word": "प्",
//     "palign": 0,
//     "startS": 111.30319,
//     "success": true
//   },
//   {
//     "endS": 111.38298,
//     "word": "या",
//     "palign": 0,
//     "startS": 111.38298,
//     "success": true
//   },
//   {
//     "endS": 111.70213,
//     "word": "र, ",
//     "palign": 0,
//     "startS": 111.54255,
//     "success": true
//   },
//   {
//     "endS": 111.82979,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 111.78191,
//     "success": true
//   },
//   {
//     "endS": 111.92553,
//     "word": "मे",
//     "palign": 0,
//     "startS": 111.87766,
//     "success": true
//   },
//   {
//     "endS": 112.02128,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 111.9734,
//     "success": true
//   },
//   {
//     "endS": 112.73936,
//     "word": "सं",
//     "palign": 0,
//     "startS": 112.18085,
//     "success": true
//   },
//   {
//     "endS": 114.33511,
//     "word": "सा",
//     "palign": 0,
//     "startS": 112.89894,
//     "success": true
//   },
//   {
//     "endS": 115.77128,
//     "word": "र\n",
//     "palign": 0,
//     "startS": 114.49468,
//     "success": true
//   },
//   {
//     "endS": 116.25,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 115.93085,
//     "success": true
//   },
//   {
//     "endS": 116.60904,
//     "word": "साँ",
//     "palign": 0,
//     "startS": 116.40957,
//     "success": true
//   },
//   {
//     "endS": 116.80851,
//     "word": "स ",
//     "palign": 0,
//     "startS": 116.72872,
//     "success": true
//   },
//   {
//     "endS": 117.44681,
//     "word": "में ",
//     "palign": 0,
//     "startS": 116.96809,
//     "success": true
//   },
//   {
//     "endS": 117.76596,
//     "word": "बस ",
//     "palign": 0,
//     "startS": 117.5266,
//     "success": true
//   },
//   {
//     "endS": 118.08511,
//     "word": "ते",
//     "palign": 0,
//     "startS": 117.92553,
//     "success": true
//   },
//   {
//     "endS": 118.40426,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 118.24468,
//     "success": true
//   },
//   {
//     "endS": 118.60372,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 118.48404,
//     "success": true
//   },
//   {
//     "endS": 118.80319,
//     "word": "इं",
//     "palign": 0,
//     "startS": 118.7234,
//     "success": true
//   },
//   {
//     "endS": 119.28191,
//     "word": "तज़ा",
//     "palign": 0,
//     "startS": 118.96277,
//     "success": true
//   },
//   {
//     "endS": 121.51596,
//     "word": "र\n",
//     "palign": 0,
//     "startS": 119.44149,
//     "success": true
//   },
//   {
//     "endS": 121.71543,
//     "word": "ते",
//     "palign": 0,
//     "startS": 121.61569,
//     "success": true
//   },
//   {
//     "endS": 121.91489,
//     "word": "रे ",
//     "palign": 0,
//     "startS": 121.81516,
//     "success": true
//   },
//   {
//     "endS": 122.15426,
//     "word": "बि",
//     "palign": 0,
//     "startS": 122.07447,
//     "success": true
//   },
//   {
//     "endS": 122.71277,
//     "word": "ना ",
//     "palign": 0,
//     "startS": 122.31383,
//     "success": true
//   },
//   {
//     "endS": 123.03191,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 122.79255,
//     "success": true
//   },
//   {
//     "endS": 123.43085,
//     "word": "पल ",
//     "palign": 0,
//     "startS": 123.19149,
//     "success": true
//   },
//   {
//     "endS": 123.86968,
//     "word": "है ",
//     "palign": 0,
//     "startS": 123.59043,
//     "success": true
//   },
//   {
//     "endS": 124.14894,
//     "word": "सू",
//     "palign": 0,
//     "startS": 123.98936,
//     "success": true
//   },
//   {
//     "endS": 125.06649,
//     "word": "ना\n",
//     "palign": 0,
//     "startS": 124.30851,
//     "success": true
//   },
//   {
//     "endS": 125.38564,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 125.18617,
//     "success": true
//   },
//   {
//     "endS": 125.625,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 125.50532,
//     "success": true
//   },
//   {
//     "endS": 125.86436,
//     "word": "तो ",
//     "palign": 0,
//     "startS": 125.74468,
//     "success": true
//   },
//   {
//     "endS": 126.12766,
//     "word": "है ",
//     "palign": 0,
//     "startS": 125.98404,
//     "success": true
//   },
//   {
//     "endS": 126.25532,
//     "word": "मे",
//     "palign": 0,
//     "startS": 126.19149,
//     "success": true
//   },
//   {
//     "endS": 126.38298,
//     "word": "री ",
//     "palign": 0,
//     "startS": 126.31915,
//     "success": true
//   },
//   {
//     "endS": 126.70213,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 126.54255,
//     "success": true
//   },
//   {
//     "endS": 127.18085,
//     "word": "तमन्",
//     "palign": 0,
//     "startS": 126.8617,
//     "success": true
//   },
//   {
//     "endS": 133.80319,
//     "word": "ना\n\n(",
//     "palign": 0,
//     "startS": 127.34043,
//     "success": true
//   },
//   {
//     "endS": 134.08245,
//     "word": "Bridge)\n",
//     "palign": 0,
//     "startS": 133.82979,
//     "success": true
//   },
//   {
//     "endS": 134.48138,
//     "word": "ये ",
//     "palign": 0,
//     "startS": 134.20213,
//     "success": true
//   },
//   {
//     "endS": 134.76064,
//     "word": "बं",
//     "palign": 0,
//     "startS": 134.60106,
//     "success": true
//   },
//   {
//     "endS": 135.55851,
//     "word": "धन ",
//     "palign": 0,
//     "startS": 134.92021,
//     "success": true
//   },
//   {
//     "endS": 135.99734,
//     "word": "है ",
//     "palign": 0,
//     "startS": 135.71809,
//     "success": true
//   },
//   {
//     "endS": 136.19681,
//     "word": "प्",
//     "palign": 0,
//     "startS": 136.11702,
//     "success": true
//   },
//   {
//     "endS": 136.2766,
//     "word": "या",
//     "palign": 0,
//     "startS": 136.2367,
//     "success": true
//   },
//   {
//     "endS": 136.51596,
//     "word": "र ",
//     "palign": 0,
//     "startS": 136.2766,
//     "success": true
//   },
//   {
//     "endS": 137.15426,
//     "word": "का, ",
//     "palign": 0,
//     "startS": 136.67553,
//     "success": true
//   },
//   {
//     "endS": 137.35372,
//     "word": "ये ",
//     "palign": 0,
//     "startS": 137.23404,
//     "success": true
//   },
//   {
//     "endS": 137.91223,
//     "word": "कभी ",
//     "palign": 0,
//     "startS": 137.4734,
//     "success": true
//   },
//   {
//     "endS": 138.55053,
//     "word": "ना ",
//     "palign": 0,
//     "startS": 138.03191,
//     "success": true
//   },
//   {
//     "endS": 138.90957,
//     "word": "टू",
//     "palign": 0,
//     "startS": 138.67021,
//     "success": true
//   },
//   {
//     "endS": 139.22872,
//     "word": "टे",
//     "palign": 0,
//     "startS": 139.06915,
//     "success": true
//   },
//   {
//     "endS": 140.18617,
//     "word": "गा\n",
//     "palign": 0,
//     "startS": 139.3883,
//     "success": true
//   },
//   {
//     "endS": 140.26596,
//     "word": "ते",
//     "palign": 0,
//     "startS": 140.26596,
//     "success": true
//   },
//   {
//     "endS": 140.625,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 140.42553,
//     "success": true
//   },
//   {
//     "endS": 140.82447,
//     "word": "मे",
//     "palign": 0,
//     "startS": 140.74468,
//     "success": true
//   },
//   {
//     "endS": 142.02128,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 140.98404,
//     "success": true
//   },
//   {
//     "endS": 142.10106,
//     "word": "रि",
//     "palign": 0,
//     "startS": 142.10106,
//     "success": true
//   },
//   {
//     "endS": 142.18085,
//     "word": "श्",
//     "palign": 0,
//     "startS": 142.18085,
//     "success": true
//   },
//   {
//     "endS": 142.4734,
//     "word": "ता, ",
//     "palign": 0,
//     "startS": 142.26064,
//     "success": true
//   },
//   {
//     "endS": 142.97872,
//     "word": "ये ",
//     "palign": 0,
//     "startS": 142.57979,
//     "success": true
//   },
//   {
//     "endS": 143.33777,
//     "word": "कभी ",
//     "palign": 0,
//     "startS": 143.05851,
//     "success": true
//   },
//   {
//     "endS": 143.53723,
//     "word": "ना ",
//     "palign": 0,
//     "startS": 143.45745,
//     "success": true
//   },
//   {
//     "endS": 143.61702,
//     "word": "छू",
//     "palign": 0,
//     "startS": 143.61702,
//     "success": true
//   },
//   {
//     "endS": 144.73404,
//     "word": "टे",
//     "palign": 0,
//     "startS": 143.7766,
//     "success": true
//   },
//   {
//     "endS": 146.01064,
//     "word": "गा\n",
//     "palign": 0,
//     "startS": 144.89362,
//     "success": true
//   },
//   {
//     "endS": 146.40957,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 146.09043,
//     "success": true
//   },
//   {
//     "endS": 146.64894,
//     "word": "सु",
//     "palign": 0,
//     "startS": 146.56915,
//     "success": true
//   },
//   {
//     "endS": 147.60638,
//     "word": "बह, ",
//     "palign": 0,
//     "startS": 146.72872,
//     "success": true
//   },
//   {
//     "endS": 148.08511,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 147.68617,
//     "success": true
//   },
//   {
//     "endS": 148.32447,
//     "word": "शा",
//     "palign": 0,
//     "startS": 148.24468,
//     "success": true
//   },
//   {
//     "endS": 149.32181,
//     "word": "म, ",
//     "palign": 0,
//     "startS": 148.48404,
//     "success": true
//   },
//   {
//     "endS": 149.68085,
//     "word": "बस ",
//     "palign": 0,
//     "startS": 149.44149,
//     "success": true
//   },
//   {
//     "endS": 150,
//     "word": "ते",
//     "palign": 0,
//     "startS": 149.84043,
//     "success": true
//   },
//   {
//     "endS": 150.67819,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 150.15957,
//     "success": true
//   },
//   {
//     "endS": 151.2367,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 150.79787,
//     "success": true
//   },
//   {
//     "endS": 151.35638,
//     "word": "ना",
//     "palign": 0,
//     "startS": 151.35638,
//     "success": true
//   },
//   {
//     "endS": 152.23404,
//     "word": "म\n",
//     "palign": 0,
//     "startS": 151.51596,
//     "success": true
//   },
//   {
//     "endS": 152.59309,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 152.39362,
//     "success": true
//   },
//   {
//     "endS": 152.80851,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 152.71277,
//     "success": true
//   },
//   {
//     "endS": 153,
//     "word": "मे",
//     "palign": 0,
//     "startS": 152.90426,
//     "success": true
//   },
//   {
//     "endS": 153.43085,
//     "word": "री ",
//     "palign": 0,
//     "startS": 153.09574,
//     "success": true
//   },
//   {
//     "endS": 153.75,
//     "word": "मं",
//     "palign": 0,
//     "startS": 153.59043,
//     "success": true
//   },
//   {
//     "endS": 153.90957,
//     "word": "ज़ि",
//     "palign": 0,
//     "startS": 153.82979,
//     "success": true
//   },
//   {
//     "endS": 154.9867,
//     "word": "ल, ",
//     "palign": 0,
//     "startS": 154.06915,
//     "success": true
//   },
//   {
//     "endS": 155.38564,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 155.10638,
//     "success": true
//   },
//   {
//     "endS": 155.84043,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 155.50532,
//     "success": true
//   },
//   {
//     "endS": 156.03191,
//     "word": "मे",
//     "palign": 0,
//     "startS": 155.93617,
//     "success": true
//   },
//   {
//     "endS": 156.78191,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 156.12766,
//     "success": true
//   },
//   {
//     "endS": 157.02128,
//     "word": "मु",
//     "palign": 0,
//     "startS": 156.94149,
//     "success": true
//   },
//   {
//     "endS": 157.26064,
//     "word": "का",
//     "palign": 0,
//     "startS": 157.18085,
//     "success": true
//   },
//   {
//     "endS": 182.44681,
//     "word": "म\n\n(",
//     "palign": 0,
//     "startS": 157.42021,
//     "success": true
//   },
//   {
//     "endS": 183.75,
//     "word": "Guitar ",
//     "palign": 0,
//     "startS": 182.55319,
//     "success": true
//   },
//   {
//     "endS": 184.65957,
//     "word": "Solo - ",
//     "palign": 0,
//     "startS": 183.85638,
//     "success": true
//   },
//   {
//     "endS": 185.82447,
//     "word": "soft ",
//     "palign": 0,
//     "startS": 184.75532,
//     "success": true
//   },
//   {
//     "endS": 187.34043,
//     "word": "and ",
//     "palign": 0,
//     "startS": 186.14362,
//     "success": true
//   },
//   {
//     "endS": 190.87101,
//     "word": "romantic)\n\n(",
//     "palign": 0,
//     "startS": 187.42021,
//     "success": true
//   },
//   {
//     "endS": 194.3617,
//     "word": "Guitar ",
//     "palign": 0,
//     "startS": 190.93085,
//     "success": true
//   },
//   {
//     "endS": 194.84043,
//     "word": "Solo - ",
//     "palign": 0,
//     "startS": 194.46144,
//     "success": true
//   },
//   {
//     "endS": 195,
//     "word": "soft ",
//     "palign": 0,
//     "startS": 194.88032,
//     "success": true
//   },
//   {
//     "endS": 196.2766,
//     "word": "and ",
//     "palign": 0,
//     "startS": 195.15957,
//     "success": true
//   },
//   {
//     "endS": 198.41489,
//     "word": "romantic)\n\n(",
//     "palign": 0,
//     "startS": 196.43617,
//     "success": true
//   },
//   {
//     "endS": 199.42819,
//     "word": "Outro)\n",
//     "palign": 0,
//     "startS": 198.43085,
//     "success": true
//   },
//   {
//     "endS": 199.82713,
//     "word": "हाँ, ",
//     "palign": 0,
//     "startS": 199.54787,
//     "success": true
//   },
//   {
//     "endS": 200.10638,
//     "word": "मे",
//     "palign": 0,
//     "startS": 199.94681,
//     "success": true
//   },
//   {
//     "endS": 206.96809,
//     "word": "री ",
//     "palign": 0,
//     "startS": 206.56915,
//     "success": true
//   },
//   {
//     "endS": 207.20745,
//     "word": "दि",
//     "palign": 0,
//     "startS": 207.12766,
//     "success": true
//   },
//   {
//     "endS": 207.44681,
//     "word": "व्",
//     "palign": 0,
//     "startS": 207.36702,
//     "success": true
//   },
//   {
//     "endS": 209.72074,
//     "word": "या, ",
//     "palign": 0,
//     "startS": 207.56649,
//     "success": true
//   },
//   {
//     "endS": 210,
//     "word": "मे",
//     "palign": 0,
//     "startS": 209.84043,
//     "success": true
//   },
//   {
//     "endS": 210.27926,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 210.15957,
//     "success": true
//   },
//   {
//     "endS": 210.31915,
//     "word": "प्",
//     "palign": 0,
//     "startS": 210.31915,
//     "success": true
//   },
//   {
//     "endS": 210.47872,
//     "word": "या",
//     "palign": 0,
//     "startS": 210.47872,
//     "success": true
//   },
//   {
//     "endS": 212.93218,
//     "word": "र...\n",
//     "palign": 0,
//     "startS": 210.6383,
//     "success": true
//   },
//   {
//     "endS": 213.1516,
//     "word": "तू ",
//     "palign": 0,
//     "startS": 213.03191,
//     "success": true
//   },
//   {
//     "endS": 213.39096,
//     "word": "ही ",
//     "palign": 0,
//     "startS": 213.27128,
//     "success": true
//   },
//   {
//     "endS": 215.38564,
//     "word": "है ",
//     "palign": 0,
//     "startS": 213.51064,
//     "success": true
//   },
//   {
//     "endS": 215.50532,
//     "word": "मे",
//     "palign": 0,
//     "startS": 215.50532,
//     "success": true
//   },
//   {
//     "endS": 215.86436,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 215.66489,
//     "success": true
//   },
//   {
//     "endS": 216.38298,
//     "word": "सं",
//     "palign": 0,
//     "startS": 215.98404,
//     "success": true
//   },
//   {
//     "endS": 216.54255,
//     "word": "सा",
//     "palign": 0,
//     "startS": 216.54255,
//     "success": true
//   },
//   {
//     "endS": 218.87633,
//     "word": "र...\n",
//     "palign": 0,
//     "startS": 216.70213,
//     "success": true
//   },
//   {
//     "endS": 219.25532,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 218.93617,
//     "success": true
//   },
//   {
//     "endS": 221.8484,
//     "word": "पल, ",
//     "palign": 0,
//     "startS": 219.41489,
//     "success": true
//   },
//   {
//     "endS": 222.28723,
//     "word": "हर ",
//     "palign": 0,
//     "startS": 221.96809,
//     "success": true
//   },
//   {
//     "endS": 224.54122,
//     "word": "दम... ",
//     "palign": 0,
//     "startS": 222.44681,
//     "success": true
//   },
//   {
//     "endS": 224.84043,
//     "word": "बस ",
//     "palign": 0,
//     "startS": 224.60106,
//     "success": true
//   },
//   {
//     "endS": 225,
//     "word": "ते",
//     "palign": 0,
//     "startS": 225,
//     "success": true
//   },
//   {
//     "endS": 225.47872,
//     "word": "रा ",
//     "palign": 0,
//     "startS": 225.15957,
//     "success": true
//   },
//   {
//     "endS": 225.55851,
//     "word": "ना",
//     "palign": 0,
//     "startS": 225.55851,
//     "success": true
//   },
//   {
//     "endS": 226.11702,
//     "word": "म...\n\n",
//     "palign": 0,
//     "startS": 225.6516,
//     "success": true
//   }
// ];


// const alignedWordsProcessed = convertAlignWordsFormatForLyricsProcessing(alignedWords);

// const lyricLines = convertToLyricLines(alignedWordsProcessed);

// console.log(JSON.stringify(lyricLines));