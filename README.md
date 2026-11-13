# Tree of Life

規格：[fruit-growth-spec.md](fruit-growth-spec.md)（v0.3）

## 檔案

| 路徑 | 內容 |
|---|---|
| `src/data.js` | 九種果子資料、成長門檻（growth_rules）、感受提示表 |
| `src/engine.js` | 成長引擎：計數、`eligibleState`、`nextState`、`recompute`、刪除預覽、樹的視覺狀態。全部是純函數 |
| `src/art.js` | 果子 × 四階段的 SVG、依視覺狀態生長的樹（白天／夜晚）、App icon |
| `src/sandbox.html` | 沙盒頁的模板 |
| `tree-3d.html` | 3D 版：樹、夥伴角色、完整的省思步驟與選果子（three.js，由 CDN 載入）。直接讀 `src/data.js`、`src/engine.js`；紀錄存在瀏覽器的 localStorage（`tol3d_v1`），網址加 `?nosave` 則不讀不寫 |
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

## 注意

- 光暈不畫在素材裡，由程式依階段加上（規格 5.2），白天 × 0.6。
- 沙盒的紀錄只存在瀏覽器的 localStorage。
- 這套素材是程式繪製的版本，之後若發包正式插畫，可以照同樣的檔名與尺寸替換。
