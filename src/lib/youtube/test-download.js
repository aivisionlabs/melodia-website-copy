const url = "https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio";
const options = {
  method: "POST",
  headers: {
    "x-rapidapi-key": "4bf4df0bb4msh8bd97ad0e77c154p1f9e95jsn54649816c522",
    "x-rapidapi-host": "youtube-mp3-2025.p.rapidapi.com",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ id: "gCNyKksha2A" }),
};

(async () => {
  try {
    const response = await fetch(url, options);
    const result = await response.text();
    console.log(JSON.parse(result));
    const data = JSON.parse(result).message;
    console.log(data.body);
    console.log(JSON.stringify(JSON.parse(data.body), null, 2));
  } catch (error) {
    console.error(error);
  }
})();
