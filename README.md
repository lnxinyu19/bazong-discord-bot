# Bazong Discord Bot

傲嬌風格的 Discord 機器人

## 功能

### 音樂指令
| 指令 | 說明 |
|------|------|
| `/play <query>` | 播放 YouTube 音樂（支援網址或關鍵字搜尋） |
| `/pause` | 暫停播放 |
| `/resume` | 繼續播放 |
| `/skip` | 跳過目前歌曲 |
| `/stop` | 停止播放並清空佇列 |
| `/queue` | 查看播放佇列 |

### 生活指令
| 指令 | 說明 |
|------|------|
| `/weather` | 查詢天氣預報（使用中央氣象署 API） |

### 管理指令
| 指令 | 說明 |
|------|------|
| `/clear <amount> [channel]` | 批次清除訊息（需要管理權限） |
| `/help` | 查看所有指令 |

## 安裝

### 環境需求
- Node.js 20+
- Discord Bot Token

### 步驟

1. 複製專案並安裝依賴
```bash
git clone <repo-url>
cd bazong-discord-bot
npm install
```

2. 設定環境變數，建立 `.env` 檔案
```env
DISCORD_TOKEN=你的Discord機器人Token
CLIENT_ID=你的Discord應用程式ID
CWA_TOKEN=中央氣象署API金鑰（選填，天氣功能用）
WEATHER_CHANNEL_ID=天氣通知頻道ID（選填）
MUSIC_CHANNEL_ID=音樂通知頻道ID（選填）
```

3. 部署 Slash Commands
```bash
npm run deploy
```

4. 啟動機器人
```bash
npm start
```

## 開發

```bash
# 使用 nodemon 開發模式（自動重啟）
npm run dev
```
