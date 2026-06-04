const config = window.APP_CONFIG ?? {};

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
const DEFAULT_LIMIT = Number(config.DEFAULT_LIMIT ?? 20);
const WORD_INDEX_STORAGE_PREFIX = "jpstudy:wordIndex";

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signUpButton = document.getElementById("signUpButton");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const userEmail = document.getElementById("userEmail");
const authStatus = document.getElementById("authStatus");

const dashboardPanel = document.getElementById("dashboardPanel");
const historyPanel = document.getElementById("historyPanel");
const newStudyForm = document.getElementById("newStudyForm");
const continueButton = document.getElementById("continueButton");
const showNewStudyButton = document.getElementById("showNewStudyButton");
const levelStats = document.getElementById("levelStats");
const createSessionButton = document.getElementById("createSessionButton");
const sessionPanel = document.getElementById("sessionPanel");
const sessionTitle = document.getElementById("sessionTitle");
const backToDashboardButton = document.getElementById("backToDashboardButton");
const levelSelect = document.getElementById("levelSelect");
const wordCountInput = document.getElementById("wordCountInput");
const statusText = document.getElementById("status");
const sessionList = document.getElementById("sessionList");
const cardStudy = document.getElementById("cardStudy");
const cardProgress = document.getElementById("cardProgress");
const wordCard = document.getElementById("wordCard");
const prevCardButton = document.getElementById("prevCardButton");
const nextCardButton = document.getElementById("nextCardButton");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing application configuration.");
}

wordCountInput.value = String(DEFAULT_LIMIT);

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let currentUser = null;
let currentSessionId = null;
let currentWords = [];
let currentWordIndex = 0;
let isStudyLoading = false;

const ENTRY_TYPE_LABELS = {
  noun: "명사",
  verb: "동사",
  i_adjective: "い형용사",
  na_adjective: "な형용사",
  adverb: "부사",
  expression: "표현",
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
let levelWordTotals = createEmptyLevelTotals();

function showAuthScreen() {
  authScreen.hidden = false;
  appShell.hidden = true;

  authScreen.style.display = "grid";
  appShell.style.display = "none";
}

function showDashboard() {
  currentSessionId = null;
  currentWords = [];
  currentWordIndex = 0;
  dashboardPanel.hidden = false;
  historyPanel.hidden = false;
  sessionPanel.hidden = true;
  cardStudy.hidden = true;
  wordCard.innerHTML = "";
}

function setStatus(message) {
  statusText.textContent = message;
}

function setAuthStatus(message) {
  authStatus.textContent = message;
}

function setAuthLoading(isLoading) {
  signUpButton.disabled = isLoading;
  signInButton.disabled = isLoading;
  signOutButton.disabled = isLoading;
}

function setStudyLoading(isLoading) {
  isStudyLoading = isLoading;
  continueButton.disabled = isLoading;
  showNewStudyButton.disabled = isLoading;
  createSessionButton.disabled = isLoading;
  backToDashboardButton.disabled = isLoading;

  for (const button of sessionList.querySelectorAll(".session-resume-button")) {
    button.disabled = isLoading;
  }
}

function createEmptyLevelTotals(defaultValue = 0) {
  return Object.fromEntries(JLPT_LEVELS.map((level) => [level, defaultValue]));
}

function readRowArray(data) {
  if (!Array.isArray(data)) {
    throw new Error("Expected row array response.");
  }

  return data;
}

function saveCurrentWordIndex() {
  if (!currentUser?.id || !currentSessionId || currentWords.length === 0) return;

  const storageKey = `${WORD_INDEX_STORAGE_PREFIX}:${currentUser.id}:${currentSessionId}`;

  try {
    localStorage.setItem(storageKey, String(currentWordIndex));
  } catch (err) {
    console.error(err);
  }
}

function getAuthInput() {
  const email = authEmail.value.trim();
  const password = authPassword.value;

  if (!email) {
    throw new Error("이메일을 입력하세요.");
  }

  if (!password) {
    throw new Error("비밀번호를 입력하세요.");
  }

  if (password.length < 6) {
    throw new Error("비밀번호는 최소 6자 이상이어야 합니다.");
  }

  return { email, password };
}

async function updateAuthUI(session, { resetView = true } = {}) {
  currentUser = session?.user ?? null;

  if (currentUser) {
    authScreen.hidden = true;
    appShell.hidden = false;
    authScreen.style.display = "none";
    appShell.style.display = "block";

    userEmail.textContent = `${currentUser.email} 로그인 중`;
    setAuthStatus("");

    if (resetView) {
      showDashboard();
      setStatus("학습 기록을 불러오는 중...");
      await loadStudyHistory();
    }

    return;
  }

  showAuthScreen();
  userEmail.textContent = "";
  setStatus("");
  currentSessionId = null;
  sessionPanel.hidden = true;
  cardStudy.hidden = true;
  wordCard.innerHTML = "";
  sessionList.innerHTML = "";
  levelStats.innerHTML = "";
}

async function signUp() {
  let authInput;

  try {
    authInput = getAuthInput();
  } catch (err) {
    setAuthStatus(err.message ?? "입력값을 확인하세요.");
    return;
  }

  setAuthLoading(true);
  setAuthStatus("회원가입 중...");

  try {
    const { email, password } = authInput;

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (!data.session) {
      setAuthStatus(
        "회원가입은 되었지만 바로 로그인되지 않았습니다."
      );
      return;
    }

    await updateAuthUI(data.session);
  } catch (err) {
    console.error(err);
    setAuthStatus("회원가입에 실패했습니다.");
  } finally {
    setAuthLoading(false);
  }
}

async function signIn() {
  let authInput;

  try {
    authInput = getAuthInput();
  } catch (err) {
    setAuthStatus(err.message ?? "입력값을 확인하세요.");
    return;
  }

  setAuthLoading(true);
  setAuthStatus("로그인 중...");

  try {
    const { email, password } = authInput;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const session = data.session;

    if (!session) {
      throw new Error("Missing signed-in session.");
    }

    await updateAuthUI(session);
  } catch (err) {
    console.error(err);
    setAuthStatus("로그인에 실패했습니다.");
  } finally {
    setAuthLoading(false);
  }
}

async function signOut() {
  setAuthLoading(true);

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    await updateAuthUI(null);
    setAuthStatus("로그아웃되었습니다.");
  } catch (err) {
    console.error(err);
    setAuthStatus("로그아웃에 실패했습니다.");
  } finally {
    setAuthLoading(false);
  }
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text ?? "";
  return element;
}

function renderCurrentWord() {
  wordCard.innerHTML = "";

  if (currentWords.length === 0) {
    wordCard.textContent = "단어가 없습니다.";
    cardProgress.textContent = "";
    prevCardButton.disabled = true;
    nextCardButton.disabled = true;
    return;
  }

  const row = currentWords[currentWordIndex];
  const typeLabel =
    ENTRY_TYPE_LABELS[row.entry_type] ?? row.section ?? row.entry_type ?? "";

  if (typeLabel) {
    const typeBadge = createTextElement("div", "word-type", typeLabel);
    wordCard.appendChild(typeBadge);
  }

  const top = document.createElement("div");
  top.className = "word-top";

  const jp = createTextElement("span", "jp", row.jp ?? "-");
  const kana = createTextElement("span", "kana", row.kana ?? "");

  top.appendChild(jp);
  top.appendChild(kana);

  const meaning = createTextElement("div", "meaning", row.meaning ?? "-");

  wordCard.appendChild(top);
  wordCard.appendChild(meaning);

  if (row.example_jp || row.example_ko) {
    const exampleBox = document.createElement("div");
    exampleBox.className = "example-box";

    if (row.example_jp) {
      exampleBox.appendChild(
        createTextElement("p", "example-jp", row.example_jp)
      );
    }

    if (row.example_ko) {
      exampleBox.appendChild(
        createTextElement("p", "example-ko", row.example_ko)
      );
    }

    wordCard.appendChild(exampleBox);
  }

  cardProgress.textContent = `${currentWordIndex + 1} / ${currentWords.length}`;
  prevCardButton.disabled = false;
  nextCardButton.disabled = false;
}

async function loadStudyHistory({ updateStatus = true } = {}) {
  try {
    const [sessionsResult, totalsResult] = await Promise.all([
      supabaseClient.rpc("list_study_sessions"),
      supabaseClient.rpc("get_word_level_totals"),
    ]);

    if (sessionsResult.error) throw sessionsResult.error;
    if (totalsResult.error) throw totalsResult.error;

    const sessions = readRowArray(sessionsResult.data);
    const totals = createEmptyLevelTotals(0);

    for (const row of readRowArray(totalsResult.data)) {
      if (JLPT_LEVELS.includes(row.level)) {
        totals[row.level] = Number(row.word_count ?? 0);
      }
    }

    levelWordTotals = totals;

    const studiedTotals = createEmptyLevelTotals(0);

    for (const session of sessions) {
      studiedTotals[session.level] =
        (studiedTotals[session.level] ?? 0) + Number(session.word_count ?? 0);
    }

    levelStats.innerHTML = "";

    for (const level of JLPT_LEVELS) {
      const item = document.createElement("span");
      item.className = "level-stat";

      item.appendChild(createTextElement("span", "level-stat-level", `${level}:`));
      item.appendChild(
        createTextElement("span", "level-stat-studied", studiedTotals[level])
      );
      item.appendChild(createTextElement("span", "level-stat-separator", "/"));
      item.appendChild(
        createTextElement("span", "level-stat-total", levelWordTotals[level])
      );
      item.appendChild(createTextElement("span", "level-stat-unit", "개"));

      levelStats.appendChild(item);
    }

    sessionList.innerHTML = "";

    if (sessions.length === 0) {
      const empty = document.createElement("li");
      empty.className = "session-empty";
      empty.textContent = "아직 학습 기록이 없습니다.";
      sessionList.appendChild(empty);
    } else {
      const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      for (const session of sessions) {
        const li = document.createElement("li");
        li.className = "session-row";

        const meta = document.createElement("div");
        meta.className = "session-meta";

        const title = createTextElement(
          "strong",
          "session-title",
          `${session.level} · ${session.word_count}개`
        );
        const createdAt = createTextElement(
          "span",
          "session-date",
          dateTimeFormatter.format(new Date(session.created_at))
        );

        meta.appendChild(title);
        meta.appendChild(createdAt);

        if (session.is_recent) {
          meta.appendChild(
            createTextElement("span", "session-badge", "24시간 이내")
          );
        }

        const button = document.createElement("button");
        button.className = "secondary-button small session-resume-button";
        button.disabled = isStudyLoading;
        button.type = "button";
        button.textContent = "이어하기";
        button.addEventListener("click", () => resumeSession(session.session_id));

        li.appendChild(meta);
        li.appendChild(button);
        sessionList.appendChild(li);
      }
    }

    if (updateStatus) {
      setStatus(
        sessions.length > 0
          ? `학습 기록 ${sessions.length}개`
          : "새로 시작하기로 첫 학습을 만들어보세요."
      );
    }
  } catch (err) {
    console.error(err);
    setStatus("학습 기록을 불러오지 못했습니다.");
  }
}

function openSession(rows) {
  if (rows.length === 0) {
    throw new Error("Cannot open an empty study session.");
  }

  currentSessionId = rows[0].session_id;
  currentWords = rows;
  currentWordIndex = 0;

  if (currentUser?.id && currentSessionId) {
    const storageKey = `${WORD_INDEX_STORAGE_PREFIX}:${currentUser.id}:${currentSessionId}`;

    try {
      const savedIndex = Number.parseInt(localStorage.getItem(storageKey), 10);

      if (Number.isInteger(savedIndex)) {
        currentWordIndex = Math.min(Math.max(savedIndex, 0), rows.length - 1);
      }
    } catch (err) {
      console.error(err);
    }
  }

  saveCurrentWordIndex();

  dashboardPanel.hidden = true;
  historyPanel.hidden = true;
  sessionPanel.hidden = false;
  cardStudy.hidden = false;
  sessionTitle.textContent = `${rows[0].level} 학습 단어 ${rows.length}개`;

  renderCurrentWord();
  return rows[0].level;
}

async function continueRecentSession() {
  if (isStudyLoading) return;

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  setStudyLoading(true);
  setStatus("최근 24시간 이내 학습을 찾는 중...");

  try {
    const { data, error } = await supabaseClient.rpc(
      "get_recent_study_session_words",
      { p_hours: 24 }
    );

    if (error) throw error;

    const rows = readRowArray(data);

    if (rows.length === 0) {
      setStatus("24시간 이내 진행 중인 학습이 없습니다. 새로 시작하세요.");
      return;
    }

    const level = openSession(rows);
    setStatus(`최근 ${level} 학습을 이어갑니다.`);
  } catch (err) {
    console.error(err);
    setStatus("이어하기에 실패했습니다.");
  } finally {
    setStudyLoading(false);
  }
}

async function resumeSession(sessionId) {
  if (isStudyLoading) return;

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  setStudyLoading(true);
  setStatus("학습 세션을 여는 중...");

  try {
    const { data, error } = await supabaseClient.rpc("get_study_session_words", {
      p_session_id: sessionId,
    });

    if (error) throw error;

    const rows = readRowArray(data);
    const level = openSession(rows);
    setStatus(`${level} 학습 기록을 열었습니다.`);
  } catch (err) {
    console.error(err);
    setStatus("학습 세션을 열지 못했습니다.");
  } finally {
    setStudyLoading(false);
  }
}

async function createNewStudySession() {
  if (isStudyLoading) return;

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  const level = levelSelect.value;
  const studyLimit = Number.parseInt(wordCountInput.value, 10);

  if (!Number.isInteger(studyLimit) || studyLimit < 1 || studyLimit > 100) {
    setStatus("단어 수는 1개 이상 100개 이하로 입력하세요.");
    return;
  }

  setStudyLoading(true);
  setStatus(`${level} 새 학습 ${studyLimit}개를 만드는 중...`);
  wordCard.innerHTML = "";

  try {
    const { data, error } = await supabaseClient.rpc("create_new_study_session", {
      p_level: level,
      p_limit: studyLimit,
    });

    if (error) throw error;

    const rows = readRowArray(data);

    if (rows.length === 0) {
      showDashboard();
      setStatus(`${level}에서 아직 안 본 단어가 없습니다.`);
      return;
    }

    openSession(rows);
    setStatus(
      `${level} 새 단어 ${rows.length}개를 배정했습니다.`
    );
    await loadStudyHistory({ updateStatus: false });
  } catch (err) {
    console.error(err);
    setStatus("새 학습을 시작하지 못했습니다.");
  } finally {
    setStudyLoading(false);
  }
}

async function initAuth() {
  setAuthLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    await updateAuthUI(data.session);

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      const isSameUser = currentUser?.id === session?.user?.id;
      updateAuthUI(session, { resetView: !isSameUser });
    });
  } catch (err) {
    console.error(err);
    showAuthScreen();
    setAuthStatus("로그인 상태를 확인하지 못했습니다.");
  } finally {
    setAuthLoading(false);
  }
}

signUpButton.addEventListener("click", signUp);
signInButton.addEventListener("click", signIn);
signOutButton.addEventListener("click", signOut);
continueButton.addEventListener("click", continueRecentSession);
showNewStudyButton.addEventListener("click", () => {
  newStudyForm.hidden = !newStudyForm.hidden;
});
createSessionButton.addEventListener("click", createNewStudySession);
backToDashboardButton.addEventListener("click", async () => {
  if (isStudyLoading) return;

  setStudyLoading(true);

  try {
    showDashboard();
    await loadStudyHistory();
  } finally {
    setStudyLoading(false);
  }
});
prevCardButton.addEventListener("click", () => {
  if (currentWords.length === 0) return;

  currentWordIndex =
    (currentWordIndex - 1 + currentWords.length) % currentWords.length;
  saveCurrentWordIndex();
  renderCurrentWord();
});
nextCardButton.addEventListener("click", () => {
  if (currentWords.length === 0) return;

  currentWordIndex = (currentWordIndex + 1) % currentWords.length;
  saveCurrentWordIndex();
  renderCurrentWord();
});

function handleAuthEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    signIn();
  }
}

authEmail.addEventListener("keydown", handleAuthEnter);
authPassword.addEventListener("keydown", handleAuthEnter);

initAuth();
