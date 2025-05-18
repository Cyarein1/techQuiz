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
  limit
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

// 🔐 Replace these with your actual Firebase config

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

document.getElementById("start-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("username").value;
  const category = document.getElementById("category").value;
  currentCategory = category;

  try {
    const docRef = doc(db, "categories", category.toLowerCase());
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      questions = shuffleArray(data.questions).slice(0, 10); // Grab 10 random questions

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
    li.addEventListener("click", () => {
      handleAnswer(option, q);
    });
    list.appendChild(li);
  });

  updateProgress();
  startTimer();
}

function handleAnswer(selected, question) {
  clearInterval(timer);
  const isCorrect = selected === question.correct;
  if (isCorrect) score++;

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
  result.innerHTML = `<h2>Your Score: ${score}</h2>`;

  userAnswers.forEach((entry, i) => {
    const container = document.createElement("div");
    container.className = "review-question";

    const q = document.createElement("h4");
    q.textContent = `${i + 1}. ${entry.question}`;
    container.appendChild(q);

    entry.options.forEach((opt) => {
      const li = document.createElement("div");
      li.textContent = opt;
      li.classList.add("answer-review");

      if (opt === entry.correct) li.classList.add("correct");
      if (opt === entry.userAnswer && opt !== entry.correct)
        li.classList.add("wrong");

      container.appendChild(li);
    });

    const feedback = document.createElement("p");
    feedback.textContent =
      entry.userAnswer === entry.correct
        ? "✅ You answered correctly!"
        : `❌ You answered "${entry.userAnswer}", but the correct answer was "${entry.correct}".`;
    container.appendChild(feedback);

    result.appendChild(container);
  });

  const buttonRow = document.createElement("div");
  buttonRow.classList.add("button-row");

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Retake Quiz";
  restartBtn.onclick = () => location.reload();

  const homeBtn = document.createElement("button");
  homeBtn.textContent = "Go Home";
  homeBtn.onclick = () => {
    document.getElementById("result").style.display = "none";
    document.getElementById("start-form").style.display = "block";
    document.getElementById("leaderboard").style.display = "block";
    updateLeaderboard();
  };

  buttonRow.appendChild(restartBtn);
  buttonRow.appendChild(homeBtn);
  result.appendChild(buttonRow);

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

function saveHighScore(score) {
  const name = document.getElementById("username").value;
  addDoc(collection(db, "scores"), {
    name,
    score,
    category: currentCategory,
    timestamp: serverTimestamp(),
  })
    .then(() => updateLeaderboard())
    .catch(console.error);
}

async function updateLeaderboard() {
  const filter = document.getElementById("leaderboard-filter").value;
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";

  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(50));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const { name, score, category } = doc.data();
    if (filter === "all" || category === filter) {
      const li = document.createElement("li");
      li.textContent = `${name} - ${score} (${category})`;
      list.appendChild(li);
    }
  });
}

document
  .getElementById("leaderboard-filter")
  .addEventListener("change", updateLeaderboard);

updateLeaderboard();

