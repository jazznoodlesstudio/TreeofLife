/* 載入失敗時顯示提示（主程式或 three.js 載不到時）。必須在主程式之前載入。 */
(function () {
  function fail() { if (!window.__tol) { var el = document.getElementById('err'); if (el) el.style.display = 'grid'; } }
  addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'SCRIPT') fail(); else if (!window.__tol && e.message) fail(); }, true);
  addEventListener('load', function () { setTimeout(fail, 20000); });
})();
