let dropUnlocked = false;
let dropArmed = false;
let usedDrop = false;
let usedHint = false;
let stopTimer = null;
let currentMode = "infinite";
let animeFound = 0;
let openingFound = 0;
let wrongAnswers = [];

/*____________________________ CONST ________________________________*/

const predrop = document.getElementById("predrop");
const drop = document.getElementById("drop");
const volumeSlider = document.getElementById("volumeSlider");
const progressBar = document.getElementById("progressBar");
const timeDisplay = document.getElementById("timeDisplay");
const player = document.getElementById("player");

const closeTrainingPopupBtn =
    document.getElementById("closeTrainingPopupBtn");

closeTrainingPopupBtn.addEventListener("click", () => {

    popup.classList.add("hidden");

});

const trainingBtn =
document.getElementById("trainingModeBtn");

const infiniteBtn =
document.getElementById("infiniteModeBtn");

const popup =
document.getElementById("trainingPopup");

/*____________________________ FONCTIONS ________________________________*/

let questions = [];

async function loadQuestions() {

    const { data, error } = await db
        .from("openings")
        .select("*");

    console.log("Questions récupérées :", data);
    console.log("Erreur :", error);

    if (error) {
        console.error(error);
        alert("Erreur Supabase");
        return;
    }

    questions = data;

    if (questions.length === 0) {
        alert("Aucune question trouvée dans la base !");
        return;
    }

    loadQuestion();
}

let currentAudio = predrop;

let index = 0;
let score = 0;

function unlockAndPlayDrop() {
  dropUnlocked = true;
  usedDrop = true;

  document.getElementById("dropBtn").innerText = "▶ Drop";
  document.getElementById("dropBtn").classList.add("unlocked");

  playDrop();
}

function loadQuestion() {
    let q = questions[index];

    dropUnlocked = false;
    dropArmed = false;
    usedDrop = false;

    document.getElementById("dropBtn").innerText = "🔒 Drop";
    document.getElementById("dropBtn").classList.remove("unlocked");

    document.getElementById("dropBtn").innerText = "🔒";

    predrop.src = questions[index].audio_url;
    drop.src = questions[index].audio_url;

    document.getElementById("anime").value = "";
    document.getElementById("opening").value = "";
    document.getElementById("result").innerHTML = "";
    document.getElementById("next").style.display = "none";

    document.getElementById("progress").innerText =
        `Question ${index + 1} / ${questions.length}`;

    document.getElementById("score").innerText =
        `Score : ${score} / 100`;

    document.getElementById("validateBtn").disabled = false;

    usedHint = false;

    const hintDisplay = document.getElementById("hintDisplay");
    hintDisplay.innerHTML = "";
    hintDisplay.style.display = "none";

    document.getElementById("hintBtn").disabled = true;

    updateGlobalProgress();
}


function playPredrop() {

    console.log("=== TEST PREDROP ===");
    console.log("index =", index);
    console.log("questions =", questions);
    console.log("questions[index] =", questions[index]);

    if (currentAudio === predrop && !predrop.paused) {
        predrop.pause();

        if (stopTimer) {
            clearTimeout(stopTimer);
            stopTimer = null;
        }
        document.querySelector(".buttons button").textContent =
            "▶ Reprendre";

        return;
    }

    currentAudio.pause();
    currentAudio = predrop;

    if (
        predrop.currentTime < questions[index].predrop_start ||
        predrop.currentTime >= questions[index].predrop_end
    ) {
        predrop.currentTime = questions[index].predrop_start;
    }

    predrop.play();

    if (stopTimer) clearTimeout(stopTimer);
    const remainingTime =
        Math.max(
            0,
            questions[index].predrop_end - predrop.currentTime
        ) * 1000;

    stopTimer = setTimeout(() => {
        predrop.pause();
        resetPlayer();
    }, remainingTime);

    predrop.ontimeupdate = () => {
    if(
        predrop.currentTime >=
        questions[index].predrop_end
    ){
        predrop.pause();
        predrop.ontimeupdate = null;
        resetPlayer();
    }
    };

    document.getElementById("player").style.display = "block";
    document.querySelector(".buttons button").textContent =
        "⏸ Pause";
}

function handleDrop() {

    if (!dropUnlocked) {
        dropUnlocked = true;
        document.getElementById("hintBtn").disabled = false;
        document.getElementById("dropBtn").innerText =
            "▶ Drop";
        document.getElementById("dropBtn").classList.add("unlocked");
        return;
    }

    if (currentAudio === drop && !drop.paused) {
        drop.pause();

        if (stopTimer) {
            clearTimeout(stopTimer);
            stopTimer = null;
        }
        document.getElementById("dropBtn").innerText =
            "▶ Reprendre";

        return;
    }

    dropArmed = true;
    usedDrop = true;

    currentAudio.pause();

    predrop.currentTime = 0;

    currentAudio = drop;

    document.getElementById("player").style.display = "block";

    document.getElementById("dropBtn").innerText =
        "⏸ Pause";

    if (
        drop.currentTime < questions[index].drop_start ||
        drop.currentTime >= questions[index].drop_end
    ) {
        drop.currentTime = questions[index].drop_start;
    }

    drop.play();

    if (stopTimer) clearTimeout(stopTimer);
        const remainingTime =
        Math.max(
            0,
            questions[index].drop_end - drop.currentTime
        ) * 1000;

    stopTimer = setTimeout(() => {
        drop.pause();
        resetPlayer();
    }, remainingTime);

    drop.ontimeupdate = () => {
    if(
        drop.currentTime >=
        questions[index].drop_end
    ){
        drop.pause();
        drop.ontimeupdate = null;
        resetPlayer();
    }
    };
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function levenshtein(a, b) {

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // remplacement
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // suppression
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function validate() {
    document.getElementById("validateBtn").disabled = true;

    let q = questions[index];
    let correctAnime = q.anime;

    let anime = normalize(document.getElementById("anime").value);
    let opening = document.getElementById("opening").value.trim();

    const aliases = q.aka
    ? q.aka.split(",").map(a => a.trim())
    : [];

    aliases.unshift(q.anime);

    let animeOk = aliases.some(a => {
        const normalizedAnswer = normalize(a);
        const tolerance = normalizedAnswer.length > 15 ? 2 : 1;

        return levenshtein(
            normalizedAnswer,
            anime
        ) <= tolerance;
    });

    let openingOk =
        Number(opening) === Number(q.op_number);
    if(animeOk) animeFound++;
    if(openingOk) openingFound++;

    let animePoints = 0;
    let openingPoints = 0;

    if(!usedDrop && !usedHint){
        animePoints = 8;
        openingPoints = 2;
    }
    else if(usedDrop && !usedHint){
        animePoints = 4.5;
        openingPoints = 1.5;
    }
    else{
        animePoints = 2;
        openingPoints = 0.5;
    }

    let points = 0;

    if(animeOk)
        points += animePoints;
    if(openingOk)
        points += openingPoints;

    const oldScore = score;
    score += points;
    animateScore(oldScore, score);

    let msg = "";
    let titleColor = "";
    if(animeOk && openingOk){

    msg = "Correct !";
    titleColor = "#3ec550";
    }
    else if(animeOk){
        msg = "Bon anime, mauvais opening";
        titleColor = "#ffb300";
        wrongAnswers.push(
            `${correctAnime} - Opening ${q.op_number}`
        );
    }
    else if(openingOk){
        msg = "Bon opening, mauvais anime";
        titleColor = "#ffb300";

        wrongAnswers.push(
            `${correctAnime} - Opening ${q.op_number}`
        );
    }
    else{
        msg = "tu pues smr";
        titleColor = "#f43e3e";
        wrongAnswers.push(
            `${correctAnime} - Opening ${q.op_number}`
        );
    }

    

    document.getElementById("result").innerHTML = `
        <h2 style="color:${titleColor};"><b>${msg}</b></h2>

        <p>
            <strong>Anime :</strong> ${correctAnime}<br>
            <strong>Opening :</strong> ${q.op_number}
        </p>

        <h3>+${points} point${points > 1 ? "s" : ""}</h3>
    `;

    document.getElementById("next").style.display = "block";
}


function nextQuestion() {

    index++;

    // Fin du mode entraînement
    if (currentMode === "training" &&
        index >= questions.length) {

        showEndScreen();
        return;
    }

    // Mode infini
    if (currentMode === "infinite" &&
        index >= questions.length) {

        index = 0;

        // Plus tard on rechargera d'autres openings ici
    }

    loadQuestion();
}

function endGame() {

    document.querySelector(".card").style.display = "none";

    let appreciation = "";

    if(score >= 90)
        appreciation = "niceeee ca c mon bg";

    else if(score >= 70)
        appreciation = "pas mal pas mal";

    else if(score >= 50)
        appreciation = "Peut mieux faire.";

    else
        appreciation = "tdc t guez ou quoi";

    let mistakesHTML = "";

    if(wrongAnswers.length === 0){

        mistakesHTML =
            "<p>Partie parfaite !</p>";
    }
    else{
        mistakesHTML =
            "<h3>Questions imparfaites :</h3><ul>";
        wrongAnswers.forEach(answer => {
            mistakesHTML += `<li>${answer}</li>`;
        });
        mistakesHTML += "</ul>";
    }

    document.getElementById("end").style.display = "block";
    document.getElementById("end").innerHTML = `

        <h2>🏆 Partie terminée</h2>

        <h3>Score final : ${score} / 100</h3>
        <p>${appreciation}</p>
        <p>
            <strong>Animes trouvés :</strong>
            ${animeFound} / ${questions.length}
        </p>
        <p>
            <strong>Openings trouvés :</strong>
            ${openingFound} / ${questions.length}
        </p>
        ${mistakesHTML}
        <button onclick="location.reload()">
            Rejouer
        </button>
    `;
}

predrop.volume = 0.5;
drop.volume = 0.5;
volumeSlider.addEventListener("input", () => {

    predrop.volume = volumeSlider.value;
    drop.volume = volumeSlider.value;

});

setInterval(() => {

    if (!currentAudio || currentAudio.paused)
        return;

    let start = 0;
    let end = 0;

    if (currentAudio === predrop) {

        start = questions[index].predrop_start;
        end = questions[index].predrop_end;
    }

    else if (currentAudio === drop) {

        start = questions[index].drop_start;
        end = questions[index].drop_end;
    }

    const total = end - start;
    const current = Math.min(
        total,
        Math.max(0, currentAudio.currentTime - start)
    );

    progressBar.value = (current / total) * 100;

    timeDisplay.textContent =
        format(Math.floor(current))
        + " / "
        + format(Math.floor(total));

}, 100);

predrop.onended = resetPlayer;
drop.onended = resetPlayer;

function resetPlayer(){

    if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
    }

    document.querySelector(".buttons button").textContent =
        "▶ Predrop";
    document.getElementById("dropBtn").innerText =
        dropUnlocked ? "▶ Drop" : "🔒";
    
    progressBar.value = 0;

    timeDisplay.textContent =
    "0:00 / 0:10";
}

function format(sec){

    const m=Math.floor(sec/60);
    const s=sec%60;

    return m+":"+(s<10?"0":"")+s;

}

progressBar.addEventListener("input", () => {

    let start = 0;
    let end = 0;

    if (currentAudio === predrop) {
        start = questions[index].predrop_start;
        end = questions[index].predrop_end;
    }

    else if (currentAudio === drop) {
        start = questions[index].drop_start;
        end = questions[index].drop_end;
    }

    const total = end - start;

    currentAudio.currentTime =
        start + (progressBar.value / 100) * total;
});

function generateHint(title){

    let result = "";
    for(let i = 0; i < title.length; i++){

        const c = title[i];
        if(c === " "){
            result += " ";
        }
        else if(i === 0 || i === title.length - 1){
            result += c;
        }
        else{
            result += "_";
        }
    }
    return result;
}

function showHint(){

    if(!dropUnlocked) return;
    if(!usedDrop) return;
    if(usedHint) return;

    usedHint = true;

    const hintDisplay =
        document.getElementById("hintDisplay");

    hintDisplay.innerText =
        generateHint(questions[index].anime[0]);

    hintDisplay.style.display = "block";
    hintDisplay.style.margin = "10px 0";
}

function animateScore(oldScore, newScore){

    let current = oldScore;

    const interval = setInterval(() => {

        current++;

        let displayedScore = score;

        if(currentMode === "training"){
            displayedScore = Math.round(
                score * 100 / (questions.length * 10)
            );
        }

        document.getElementById("score").textContent =
            `Score : ${displayedScore} / 100`;

        if(current >= newScore){
            clearInterval(interval);
        }

    }, 30);
}

function updateGlobalProgress(){

    const percent =
        ((index + 1) / questions.length) * 100;

    document.getElementById("globalProgressBar")
        .style.width = percent + "%";
}

async function testSupabase() {
    const { data, error } = await db
        .from('openings')
        .select('*');

    console.log("Data :", data);
    console.log("Erreur :", error);
}

trainingBtn.addEventListener("click", () => {

    popup.classList.remove("hidden");

});

const startTrainingBtn =
    document.getElementById("startTrainingBtn");

startTrainingBtn.addEventListener("click", () => {

    popup.classList.add("hidden");

    // Active le mode entraînement
    currentMode = "training";

    trainingBtn.classList.add("active");
    infiniteBtn.classList.remove("active");

    document.querySelector(".difficulty-panel").style.display = "";

    // Nombre de questions choisies
    trainingQuestionCount = parseInt(
        document.getElementById("trainingQuestionCount").value
    );

    // Difficultés choisies
    selectedDifficulties = [...document.querySelectorAll(
        '#trainingPopup input[type="checkbox"]:checked'
    )].map(cb => cb.value);

    startTrainingGame();

});

infiniteBtn.addEventListener("click", () => {

    currentMode = "infinite";

    infiniteBtn.classList.add("active");
    trainingBtn.classList.remove("active");

    document.querySelector(".difficulty-panel").style.display = "";

});

async function startTrainingGame() {

    const { data, error } = await db
        .from("openings")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    let filtered = data.filter(op => {

        const openingDifficulties =
            op.difficulties
            .toLowerCase()
            .split(",")
            .map(d => d.trim());

        return openingDifficulties.some(diff =>
            selectedDifficulties.includes(diff)
        );

    });

    filtered.sort(() => Math.random() - 0.5);

    questions = filtered.slice(0, trainingQuestionCount);

    currentQuestionIndex = 0;
    score = 0;

    console.log("Questions sélectionnées :", questions);

    loadQuestion();
}

function showEndScreen() {

    document.querySelector(".card").style.display = "none";

    const endDiv = document.getElementById("end");

    endDiv.style.display = "block";

    let finalDisplayedScore = score;

    if(currentMode === "training"){
        finalDisplayedScore = Math.round(
            score * 100 / (questions.length * 10)
        );
    }

    endDiv.innerHTML = `
        <h2>Partie terminée !</h2>

        <p>Score final : ${finalDisplayedScore} / 100</p>

        <button onclick="replayTraining()">
            Rejouer
        </button>

        <button onclick="backToInfinite()">
            Retour au mode illimité
        </button>
    `;
}

function replayTraining() {

    document.getElementById("end").style.display = "none";

    document.querySelector(".card").style.display = "block";

    popup.classList.remove("hidden");
}

function backToInfinite() {

    document.getElementById("end").style.display = "none";
    document.querySelector(".card").style.display = "block";

    currentMode = "infinite";

    infiniteBtn.classList.add("active");
    trainingBtn.classList.remove("active");

    document.querySelector(".difficulty-panel").style.display = "";

    // Réinitialisation de l'interface
    document.getElementById("anime").value = "";
    document.getElementById("opening").value = "";

    document.getElementById("result").innerHTML = "";

    document.getElementById("next").style.display = "none";

    document.getElementById("validateBtn").disabled = false;

    index = 0;

    // Relance une nouvelle partie infinie
    startInfiniteGame();
}

loadQuestions();
