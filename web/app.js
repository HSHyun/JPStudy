const config = window.APP_CONFIG ?? {};
const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
const DEFAULT_LIMIT = Number(config.DEFAULT_LIMIT ?? 5);

const levelSelect = document.getElementById("levelSelect");
const loadButton = document.getElementById("loadButton");
const statusText = document.getElementById("status");
const wordList = document.getElementById("wordList");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing APP_CONFIG. Check web/config.js");
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function setStatus(message) {
  statusText.textContent = message;
}

function renderWords(rows) {
  wordList.innerHTML = "";

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "word-item";
    li.innerHTML = `
      <div class="word-top">
        <span class="jp">${row.jp ?? "-"}</span>
        <span class="kana">${row.kana ?? ""}</span>
      </div>
      <div class="meaning">${row.meaning ?? "-"}</div>
    `;
    wordList.appendChild(li);
  }
}

async function loadRandomWords() {
  const level = levelSelect.value;
  setStatus(`${level} 단어를 불러오는 중...`);
  loadButton.disabled = true;

  try {
    const { data, error } = await supabaseClient.rpc("get_random_words", {
      p_level: level,
      p_limit: DEFAULT_LIMIT,
    });
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    renderWords(rows);
    setStatus(`${level} 단어 ${rows.length}개`);
  } catch (err) {
    console.error(err);
    setStatus("불러오기에 실패했습니다. URL/ANON KEY/RLS 정책을 확인하세요.");
  } finally {
    loadButton.disabled = false;
  }
}

loadButton.addEventListener("click", loadRandomWords);
loadRandomWords();
