# Tree of Life

規格：[fruit-growth-spec.md](fruit-growth-spec.md)（v0.3）

## 檔案

| 路徑 | 內容 |
|---|---|
| `src/data.js` | 九種果子資料、成長門檻（growth_rules）、感受提示表 |
| `src/engine.js` | 成長引擎：計數、`eligibleState`、`nextState`、`recompute`、刪除預覽、樹的視覺狀態。全部是純函數 |
| `src/art.js` | 果子 × 四階段的 SVG、依視覺狀態生長的樹（白天／夜晚）、App icon |
| `src/sandbox.html` | 沙盒頁的模板 |
| `tree-3d.html` | 3D 版的頁面（只有版面與樣式，沒有內嵌程式） |
| `src/app.js` | 3D 版的程式：樹、夥伴角色、省思步驟與選果子、歷史軌跡、Google 登入與雲端硬碟同步 |
| `src/boot.js` | 主程式載入失敗時顯示提示 |
| `vendor/three/` | three.js 0.170.0（MIT，取自 npm 官方套件），只放用到的檔案，自己託管 |
| `config.js` | 網站設定：Google OAuth 用戶端 ID |
| `index.html` | 轉到 `tree-3d.html` |
| `test/engine.test.js` | 引擎測試（14 個） |
| `build.js` | 產生下面所有輸出 |
| `dist/sandbox.html` | 可直接開啟的沙盒頁（單一檔案） |
| `assets/fruits/*.svg` | 9 × 4 = 36 張果子階段圖，透明背景、不含光暈 |
| `assets/scenes/*.svg` | 主視覺（全部結果）與示範狀態，白天／夜晚各一 |
| `assets/app_icon.svg` | App icon，1024 × 1024 |
| `data/*.json` | `fruit_definitions`、`growth_rules`、`fruit_hints` |

## 指令

```bash
node --test test/engine.test.js
```

```bash
node build.js
```

## 3D 版的紀錄與 Google 登入

- **一天一筆**：以裝置當地的日期為準；同一天再寫，會更新當天那一筆。
- **存在哪裡**：瀏覽器的 localStorage（`tol3d_v1`）。使用者用 Google 帳號登入後，另外寫進**他自己的**雲端硬碟資料夾「生命樹 Tree of Life」；網站本身沒有伺服器，不保存任何人的紀錄：
  - `生命樹省思紀錄`：Google 試算表，每天一列，給人看的。
  - `tree-of-life-data.json`：完整資料，用來在其他裝置還原。
- **權限**：只要求 `drive.file`，只能存取這個網站自己建立的檔案。
- **合併**：同一天以 `updated_at` 較新的為準；刪除會留下時間戳記，比紀錄新才生效，避免舊裝置把刪掉的那天帶回來。
- **登出**：清除這台裝置上的紀錄與夥伴（都在使用者自己的雲端硬碟裡）；有還沒同步的變更時會先提醒。下一個人登入時看不到前一個人的紀錄。
- **第一次來**：有設定用戶端 ID 時，會先邀請登入一次，可以選「先不用」。
- **網址參數**：`?nosave` 不讀也不寫（測試用）；`?demo` 示範模式，可以快轉時間，不存檔也不同步。

### 設定 Google 登入（只需做一次）

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立專案，在「API 和服務 → 程式庫」啟用 **Google Drive API**。
2. 「OAuth 同意畫面」：使用者類型選「外部」，填 App 名稱與聯絡信箱；範圍加入 `.../auth/drive.file`。
3. 「憑證 → 建立憑證 → OAuth 用戶端 ID」，類型選「網頁應用程式」，「已授權的 JavaScript 來源」加入：
   - `https://jazznoodlesstudio.github.io`
   - `http://localhost:5196`（本機測試用）
4. 把產生的用戶端 ID 填進 `config.js` 的 `googleClientId`。
5. 同意畫面在「測試」狀態時，只有加進「測試使用者」的帳號能登入；要開放給所有人，按「發布應用程式」。

### 資安設計

- **內容安全政策（CSP）**：`tree-3d.html` 以 `<meta>` 設定，只允許自己網站的程式、Google 登入元件、Google API 連線、Google Fonts 與 Google 大頭照。頁面不能有內嵌 `<script>`，新程式請放進 `src/`。
- **第三方程式**：three.js 放在 `vendor/` 自己託管；唯一外部程式是 Google 登入元件（`accounts.google.com/gsi/client`）。
- **Google 權杖**：只存在頁面記憶體，不寫進 localStorage 或雲端硬碟；一小時後失效。
- **讀回的資料**：雲端硬碟與本機的紀錄都先經過 `cleanRecord` 驗證（日期格式、欄位型別與長度、果子與選項只接受已知的值），不合格的整筆略過。
- **顯示**：使用者寫的文字一律跳脫後才放進畫面；試算表裡以 `= + - @` 開頭的文字會加上 `'`，避免被當成公式。

## 注意

- 光暈不畫在素材裡，由程式依階段加上（規格 5.2），白天 × 0.6。
- 沙盒的紀錄只存在瀏覽器的 localStorage。
- 這套素材是程式繪製的版本，之後若發包正式插畫，可以照同樣的檔名與尺寸替換。
