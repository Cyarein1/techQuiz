import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  limit,
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXboWWLo5RNaAMq_aFgU3ihOX5Pj-CmVY",
  authDomain: "tech-quiz-app-4d17a.firebaseapp.com",
  projectId: "tech-quiz-app-4d17a",
  storageBucket: "tech-quiz-app-4d17a.firebasestorage.app",
  messagingSenderId: "230205186325",
  appId: "1:230205186325:web:6da85abe3d5d8c1e92491c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let questions = [];
let currentIndex = 0;
let score = 0;
let timer;
let userAnswers = [];
let currentCategory = "";
let latestScoreDocId = null;

document.getElementById("start-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = document.getElementById("category").value;
  currentCategory = category;

  try {
    const docRef = doc(db, "categories", category.toLowerCase());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const number = data.numberOfQuestions || 10;
      questions = shuffleArray(data.questions).slice(0, number);

      currentIndex = 0;
      score = 0;
      userAnswers = [];

      document.getElementById("start-form").style.display = "none";
      document.getElementById("quiz-container").style.display = "block";
      document.getElementById("leaderboard").style.display = "none";

      loadQuestion();
    } else {
      alert(`No questions found for category: ${category}`);
    }
  } catch (error) {
    console.error("Error fetching questions:", error);
    alert("Failed to load questions. Please try again later.");
  }
});

function loadQuestion() {
  if (currentIndex >= questions.length) return showResult();

  const q = questions[currentIndex];
  document.getElementById("question-text").textContent = q.question;
  const list = document.getElementById("answers-list");
  list.innerHTML = "";

  shuffleArray(q.options).forEach((option) => {
    const li = document.createElement("li");
    li.textContent = option;
    li.addEventListener("click", () => handleAnswer(option, q));
    list.appendChild(li);
  });

  updateProgress();
  startTimer();
}

function handleAnswer(selected, question) {
  clearInterval(timer);
  if (selected === question.correct) score++;

  userAnswers.push({
    question: question.question,
    options: question.options,
    correct: question.correct,
    userAnswer: selected,
  });

  currentIndex++;
  loadQuestion();
}

function showResult() {
  document.getElementById("quiz-container").style.display = "none";
  const result = document.getElementById("result");

  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  result.innerHTML = `<h2>Your Score: ${score}/${total} (${percent}%)</h2>`;

  result.style.display = "block";

  saveHighScore(score);
}

function updateProgress() {
  const bar = document.getElementById("progress-bar");
  bar.style.width = `${(currentIndex / questions.length) * 100}%`;
}

function startTimer() {
  let timeLeft = 10;
  const timerEl = document.getElementById("timer");
  timerEl.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      handleAnswer("", questions[currentIndex]);
    }
  }, 1000);
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

async function saveHighScore(score) {
  const name = document.getElementById("username").value;
  const percent = Math.round((score / questions.length) * 100);

  try {
    const docRef = await addDoc(collection(db, "scores"), {
      name,
      score: percent,
      category: currentCategory,
      timestamp: serverTimestamp(),
    });

    latestScoreDocId = docRef.id;
    updateLeaderboard();
  } catch (err) {
    console.error("Failed to save score:", err);
  }
}

async function updateLeaderboard() {
  const filter = document.getElementById("leaderboard-filter").value;
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";

  const q = query(collection(db, "scores"), orderBy("score", "desc"));
  const snapshot = await getDocs(q);

  let items = [];
  let currentRank = 1;
  let playerEntry = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const include = filter === "all" || data.category === filter;
    if (!include) return;

    const entry = {
      id: docSnap.id,
      name: data.name,
      score: data.score,
      category: data.category,
      rank: currentRank++,
    };

    if (docSnap.id === latestScoreDocId) playerEntry = entry;

    items.push(entry);
  });

  const top = items.slice(0, 9);
  const playerRank = playerEntry?.rank || items.length + 1;

  top.forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>#${entry.rank}</strong> ${entry.name} - ${entry.score}%`;
    list.appendChild(li);
  });

  if (items.length > 9 && playerEntry && playerEntry.rank > 9) {
    const dots = document.createElement("li");
    dots.textContent = "...";
    list.appendChild(dots);

    const li = document.createElement("li");
    li.innerHTML = `<strong>#${playerEntry.rank}</strong> ${playerEntry.name} - ${playerEntry.score}%`;
    li.style.backgroundColor = "#e8f0fe";
    li.style.fontWeight = "bold";
    li.style.border = "2px solid #4285f4";
    list.appendChild(li);
  }
}

document
  .getElementById("leaderboard-filter")
  .addEventListener("change", updateLeaderboard);

updateLeaderboard();
