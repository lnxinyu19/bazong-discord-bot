const CWA_API_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001';
const LOCATIONS = ['新北市', '臺北市', '臺南市', '高雄市'];

async function fetchWeatherData() {
  const token = process.env.CWA_TOKEN;
  if (!token) {
    throw new Error('CWA_TOKEN 未設定');
  }

  const locationParam = LOCATIONS.join(',');
  const url = `${CWA_API_URL}?Authorization=${token}&locationName=${encodeURIComponent(locationParam)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 請求失敗: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

function getElementValue(elements, elementName) {
  const element = elements.find((e) => e.elementName === elementName);
  if (!element || !element.time || element.time.length === 0) {
    return null;
  }
  // 取得最近的時段資料
  const timeData = element.time[0];
  return timeData?.parameter?.parameterName || null;
}

function parseWeatherData(data) {
  const locations = data?.records?.location || [];
  const weatherInfo = [];

  for (const location of locations) {
    const name = location.locationName;
    const elements = location.weatherElement || [];

    // 從最近時段取得各項天氣資訊
    const wx = getElementValue(elements, 'Wx') || '未知';
    const pop = getElementValue(elements, 'PoP') || '0';
    const minT = getElementValue(elements, 'MinT') || '-';
    const maxT = getElementValue(elements, 'MaxT') || '-';
    const ci = getElementValue(elements, 'CI') || '';

    weatherInfo.push({
      name,
      wx,
      pop,
      minT,
      maxT,
      ci,
    });
  }

  return weatherInfo;
}

function formatBazongWeatherMessage(weatherInfo) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

  let message = `**【天氣預報】** ${dateStr}\n\n`;
  message += `哼，告訴你們今天該怎麼穿。不聽話的話，淋雨感冒可別來找我。\n\n`;

  for (const info of weatherInfo) {
    const rainWarning = parseInt(info.pop) >= 50 ? '⚠️ **給我帶傘！**' : '';
    message += `📍 **${info.name}**\n`;
    message += `　　天氣：${info.wx}（${info.ci}）\n`;
    message += `　　溫度：${info.minT}°C ~ ${info.maxT}°C\n`;
    message += `　　降雨機率：${info.pop}% ${rainWarning}\n\n`;
  }

  const avgPop = weatherInfo.reduce((sum, i) => sum + parseInt(i.pop || 0), 0) / weatherInfo.length;

  if (avgPop >= 70) {
    message += `\n🌧️ **今天一定要帶傘，淋了雨可別讓我照顧你。**`;
  } else if (avgPop >= 50) {
    message += `\n🌦️ **帶把傘，我可不允許我的人淋到任何一滴雨。**`;
  } else if (avgPop >= 30) {
    message += `\n⛅ **天氣有點不穩定，把傘放包裡。這是命令，不是建議。**`;
  } else {
    message += `\n☀️ **今天天氣不錯，允許你們出門。準時回來，別讓我等。**`;
  }

  message += `\n\n-# 嫌囉嗦？哼，可以關閉通知，但你會後悔的。`;

  return message;
}

async function getWeatherMessage() {
  const data = await fetchWeatherData();
  const weatherInfo = parseWeatherData(data);
  return formatBazongWeatherMessage(weatherInfo);
}

module.exports = {
  fetchWeatherData,
  parseWeatherData,
  formatBazongWeatherMessage,
  getWeatherMessage,
};
