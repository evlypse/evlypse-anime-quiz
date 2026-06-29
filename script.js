let dropUnlocked = false;
let dropArmed = false;
let usedDrop = false;
let usedHint = false;

const predrop = document.getElementById("predrop");
const drop = document.getElementById("drop");
const volumeSlider = document.getElementById("volumeSlider");

let questions = [];

async function loadQuestions() {
    try {
        const response = await fetch("questions.json");
        questions = await response.json();
        if (questions.length === 0) {
            alert("Aucune question dans questions.json !");
            return;
        }
        loadQuestion();
    }
    catch (error) {
        alert(
            "Impossible de charger questions.json.\n\n" +
            "Pour jouer en local, lance le site avec Live Server."
        );
        console.error(error);
    }
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

  predrop.src = q.audio;
  drop.src = q.audio;

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
        document.querySelector(".buttons button").textContent =
            "▶ Reprendre";
        return;
    }

    currentAudio.pause();
    currentAudio = predrop;
    predrop.currentTime =
      questions[index].predropStart;
    predrop.play();

    predrop.ontimeupdate = () => {
    if(
        predrop.currentTime >=
        questions[index].predropEnd
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

    drop.currentTime =
      questions[index].dropStart;
    drop.play();

    drop.ontimeupdate = () => {
    if(
        drop.currentTime >=
        questions[index].dropEnd
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
    let correctAnime = q.anime[0];

    let anime = normalize(document.getElementById("anime").value);
    let opening = document.getElementById("opening").value.trim();

    let animeOk = q.anime.some(a => {
        const normalizedAnswer = normalize(a);
        const tolerance =
            normalizedAnswer.length > 15 ? 2 : 1;
        return levenshtein(normalizedAnswer, anime) <= tolerance;
    });

    let openingOk = opening === q.opening;
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
            `${correctAnime} - Opening ${q.opening}`
        );
    }
    else if(openingOk){
        msg = "Bon opening, mauvais anime";
        titleColor = "#ffb300";

        wrongAnswers.push(
            `${correctAnime} - Opening ${q.opening}`
        );
    }
    else{
        msg = "tu pues smr";
        titleColor = "#f43e3e";
        wrongAnswers.push(
            `${correctAnime} - Opening ${q.opening}`
        );
    }

    

    document.getElementById("result").innerHTML = `
        <h2 style="color:${titleColor};"><b>${msg}</b></h2>

        <p>
            <strong>Anime :</strong> ${correctAnime}<br>
            <strong>Opening :</strong> ${q.opening}
        </p>

        <h3>+${points} point${points > 1 ? "s" : ""}</h3>
    `;

    document.getElementById("next").style.display = "block";
}

function nextQuestion() {
  index++;

  if (index >= questions.length) {
    endGame();
    return;
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

setInterval(() => {

    if(currentAudio.duration){

        let start = 0;
        let end = currentAudio.duration;

        if(currentAudio === predrop){
            start = questions[index].predropStart;
            end = questions[index].predropEnd;
        }

        else if(currentAudio === drop){
            start = questions[index].dropStart;
            end = questions[index].dropEnd;
        }

        const current =
            currentAudio.currentTime - start;
        const total =
            end - start;

        progressBar.value =
            (current / total) * 100;

        timeDisplay.textContent =
            format(Math.floor(current))
            + " / "
            + format(Math.floor(total));
    }
},100);

predrop.onended = resetPlayer;
drop.onended = resetPlayer;

function resetPlayer(){

    document.querySelector(".buttons button").textContent =
        "▶ Predrop";
    document.getElementById("dropBtn").innerText =
        dropUnlocked ? "▶ Drop" : "🔒";
    
    progressBar.value = 0;
    player.style.display = "none";
}

function format(sec){

    const m=Math.floor(sec/60);
    const s=sec%60;

    return m+":"+(s<10?"0":"")+s;

}

progressBar.addEventListener("input", () => {

    if(currentAudio.duration){

        currentAudio.currentTime =
            (progressBar.value / 100) * currentAudio.duration;
    }

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

        document.getElementById("score").textContent =
            `Score : ${current} / 100`;

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

loadQuestions();