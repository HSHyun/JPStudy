const config = window.APP_CONFIG ?? {};

const SUPABASE_URL = config.SUPABASE_URL;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;
const DEFAULT_LIMIT = Number(config.DEFAULT_LIMIT ?? 5);

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");

const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const signUpButton = document.getElementById("signUpButton");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const userEmail = document.getElementById("userEmail");
const authStatus = document.getElementById("authStatus");

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

let currentUser = null;

function showAuthScreen() {
  authScreen.hidden = false;
  appShell.hidden = true;

  authScreen.style.display = "grid";
  appShell.style.display = "none";
}

function showAppScreen() {
  authScreen.hidden = true;
  appShell.hidden = false;

  authScreen.style.display = "none";
  appShell.style.display = "block";
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

function updateAuthUI(session) {
  currentUser = session?.user ?? null;

  if (currentUser) {
    showAppScreen();
    userEmail.textContent = `${currentUser.email} 로그인 중`;
    setAuthStatus("");
    return;
  }

  showAuthScreen();
  userEmail.textContent = "";
  setStatus("");
  wordList.innerHTML = "";
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

async function signUp() {
  setAuthLoading(true);
  setAuthStatus("회원가입 중...");

  try {
    const { email, password } = getAuthInput();

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (!data.session) {
      setAuthStatus(
        "회원가입은 되었지만 바로 로그인되지 않았습니다. Supabase에서 Confirm Email이 꺼져 있는지 확인하세요."
      );
      return;
    }

    updateAuthUI(data.session);
    await loadRandomWords();
  } catch (err) {
    console.error(err);
    setAuthStatus(err.message ?? "회원가입 실패");
  } finally {
    setAuthLoading(false);
  }
}

async function signIn() {
  setAuthLoading(true);
  setAuthStatus("로그인 중...");

  try {
    const { email, password } = getAuthInput();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    let session = data.session;

    if (!session) {
      const sessionResult = await supabaseClient.auth.getSession();

      if (sessionResult.error) throw sessionResult.error;

      session = sessionResult.data.session;
    }

    if (!session) {
      throw new Error("로그인은 성공했지만 세션을 가져오지 못했습니다.");
    }

    updateAuthUI(session);
    await loadRandomWords();
  } catch (err) {
    console.error(err);
    setAuthStatus(err.message ?? "로그인 실패");
  } finally {
    setAuthLoading(false);
  }
}

async function signOut() {
  setAuthLoading(true);

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    updateAuthUI(null);
    setAuthStatus("로그아웃되었습니다.");
  } catch (err) {
    console.error(err);
    setAuthStatus(err.message ?? "로그아웃 실패");
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

function renderWords(rows) {
  wordList.innerHTML = "";

  if (rows.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "word-item";
    emptyItem.textContent = "단어가 없습니다.";
    wordList.appendChild(emptyItem);
    return;
  }

  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "word-item";

    const top = document.createElement("div");
    top.className = "word-top";

    const jp = createTextElement("span", "jp", row.jp ?? "-");
    const kana = createTextElement("span", "kana", row.kana ?? "");

    top.appendChild(jp);
    top.appendChild(kana);

    const meaning = createTextElement("div", "meaning", row.meaning ?? "-");

    li.appendChild(top);
    li.appendChild(meaning);

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

      li.appendChild(exampleBox);
    }

    wordList.appendChild(li);
  }
}

async function loadRandomWords() {
  if (!currentUser) {
    showAuthScreen();
    return;
  }

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
    setStatus("불러오기에 실패했습니다. Supabase 설정/RLS/RPC를 확인하세요.");
  } finally {
    loadButton.disabled = false;
  }
}

async function initAuth() {
  setAuthLoading(true);

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    updateAuthUI(data.session);

    if (data.session) {
      await loadRandomWords();
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      updateAuthUI(session);
    });
  } catch (err) {
    console.error(err);
    showAuthScreen();
    setAuthStatus("로그인 상태 확인 실패");
  } finally {
    setAuthLoading(false);
  }
}

signUpButton.addEventListener("click", signUp);
signInButton.addEventListener("click", signIn);
signOutButton.addEventListener("click", signOut);
loadButton.addEventListener("click", loadRandomWords);

function handleAuthEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    signIn();
  }
}

authEmail.addEventListener("keydown", handleAuthEnter);
authPassword.addEventListener("keydown", handleAuthEnter);

initAuth();