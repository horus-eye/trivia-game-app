// SweetAlert2 is loaded from CDN and available globally as Swal

class TriviaGame {
  constructor() {
    this.players = []
    this.questions = []
    this.currentQuestionIndex = 0
    this.currentPlayerIndex = 0
    this.gameConfig = {}
    this.selectedAnswer = null
    this.roundAnswers = [] // Track answers for current question
    this.bootstrap = window.bootstrap

    this.initializeEventListeners()
  }

  initializeEventListeners() {
    document.getElementById("startGameBtn").addEventListener("click", () => this.startGame())
    document.getElementById("answerBtn").addEventListener("click", () => this.submitAnswer())
    document.getElementById("playAgainBtn").addEventListener("click", () => this.resetGame())
  }

  async startGame() {
    // Get configuration with proper validation
    const numPlayersInput = document.getElementById("numPlayers")
    const difficultyInput = document.getElementById("difficulty")
    const numQuestionsInput = document.getElementById("numQuestions")
    const categoryInput = document.getElementById("category")

    // Validate all fields
    if (!numPlayersInput.value || !difficultyInput.value || !numQuestionsInput.value) {
      window.Swal.fire({
        icon: "error",
        title: "Campos Incompletos",
        text: "Por favor, completa todos los campos requeridos.",
        confirmButtonColor: "#007bff",
      })
      return
    }

    const numPlayers = Number.parseInt(numPlayersInput.value)
    const numQuestions = Number.parseInt(numQuestionsInput.value)

    if (numPlayers < 2 || numPlayers > 8) {
      window.Swal.fire({
        icon: "error",
        title: "Número de Jugadores Inválido",
        text: "El número de jugadores debe estar entre 2 y 8.",
        confirmButtonColor: "#007bff",
      })
      return
    }

    if (numQuestions < 5 || numQuestions > 50) {
      window.Swal.fire({
        icon: "error",
        title: "Número de Preguntas Inválido",
        text: "El número de preguntas debe estar entre 5 y 50.",
        confirmButtonColor: "#007bff",
      })
      return
    }

    this.gameConfig = {
      numPlayers: numPlayers,
      difficulty: difficultyInput.value,
      numQuestions: numQuestions,
      category: categoryInput.value,
    }

    // Show loading
    this.showLoading(true)

    try {
      // Fetch questions from API
      await this.fetchQuestions()

      // Initialize players
      this.initializePlayers()

      // Setup game UI
      this.setupGameUI()

      // Hide modal and show game
      const modal = this.bootstrap.Modal.getInstance(document.getElementById("configModal"))
      modal.hide()

      document.getElementById("startSection").style.display = "none"
      document.getElementById("gameSection").style.display = "block"

      // Load first question
      this.loadQuestion()

      // Show start message
      window.Swal.fire({
        icon: "success",
        title: "¡Juego Iniciado!",
        text: `${this.gameConfig.numPlayers} jugadores, ${this.gameConfig.numQuestions} preguntas. ¡Que comience la diversión!`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      console.error("Error starting game:", error)
      window.Swal.fire({
        icon: "error",
        title: "Error al Cargar",
        text: "No se pudieron cargar las preguntas. Verifica tu conexión a internet e intenta de nuevo.",
        confirmButtonColor: "#007bff",
      })
    } finally {
      this.showLoading(false)
    }
  }

  async fetchQuestions() {
    let url = `https://opentdb.com/api.php?amount=${this.gameConfig.numQuestions}&difficulty=${this.gameConfig.difficulty}&type=multiple`

    if (this.gameConfig.category) {
      url += `&category=${this.gameConfig.category}`
    }

    const response = await fetch(url)
    const data = await response.json()

    if (data.response_code !== 0) {
      throw new Error("Error fetching questions from API")
    }

    this.questions = data.results.map((q) => ({
      question: this.decodeHTML(q.question),
      correct_answer: this.decodeHTML(q.correct_answer),
      incorrect_answers: q.incorrect_answers.map((a) => this.decodeHTML(a)),
      category: this.decodeHTML(q.category),
      difficulty: q.difficulty,
    }))

    // Save to localStorage
    localStorage.setItem("triviaQuestions", JSON.stringify(this.questions))
    localStorage.setItem("gameConfig", JSON.stringify(this.gameConfig))
  }

  decodeHTML(html) {
    const txt = document.createElement("textarea")
    txt.innerHTML = html
    return txt.value
  }

  initializePlayers() {
    this.players = []
    for (let i = 1; i <= this.gameConfig.numPlayers; i++) {
      const player = {
        name: `Player ${i}`,
        score: 0,
      }
      this.players.push(player)
      localStorage.setItem(`player${i}`, "0")
    }
  }

  setupGameUI() {
    // Update game info
    document.getElementById("totalQuestions").textContent = this.gameConfig.numQuestions
    document.getElementById("currentQuestion").textContent = "1"

    // Create player cards
    const playersContainer = document.getElementById("playersContainer")
    playersContainer.innerHTML = ""

    this.players.forEach((player, index) => {
      const playerCard = this.createPlayerCard(player, index)
      playersContainer.appendChild(playerCard)
    })

    // Highlight first player
    this.updateCurrentPlayer()
  }

  createPlayerCard(player, index) {
    const col = document.createElement("div")
    col.className = "col-md-6 col-lg-3 mb-3"

    col.innerHTML = `
            <div class="card player-card" id="player-${index}">
                <div class="card-body text-center">
                    <h5 class="card-title">
                        <i class="fas fa-user me-2"></i>${player.name}
                    </h5>
                    <div class="score-badge">
                        <i class="fas fa-star me-1"></i>
                        <span id="score-${index}">${player.score}</span> aciertos
                    </div>
                </div>
            </div>
        `

    return col
  }

  loadQuestion() {
    if (this.currentQuestionIndex >= this.questions.length) {
      this.endGame()
      return
    }

    // Reset round answers for new question
    if (this.currentPlayerIndex === 0) {
      this.roundAnswers = []
    }

    const question = this.questions[this.currentQuestionIndex]

    // Update question info
    document.getElementById("currentQuestion").textContent = this.currentQuestionIndex + 1
    document.getElementById("currentCategory").textContent = question.category
    document.getElementById("questionText").textContent = question.question

    // Create answers array and shuffle
    const answers = [...question.incorrect_answers, question.correct_answer]
    this.shuffleArray(answers)

    // Create answer buttons
    const answersContainer = document.getElementById("answersContainer")
    answersContainer.innerHTML = ""

    answers.forEach((answer, index) => {
      const button = document.createElement("button")
      button.className = "btn answer-btn w-100 text-start"
      button.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${answer}`
      button.addEventListener("click", () => this.selectAnswer(answer, button))
      answersContainer.appendChild(button)
    })

    // Reset answer button
    document.getElementById("answerBtn").disabled = true
    this.selectedAnswer = null
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  selectAnswer(answer, button) {
    // Remove previous selection
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      btn.classList.remove("selected")
      btn.style.backgroundColor = ""
      btn.style.borderColor = "#e9ecef"
    })

    // Select current answer
    button.classList.add("selected")
    button.style.backgroundColor = "#e3f2fd"
    button.style.borderColor = "#007bff"

    this.selectedAnswer = answer
    document.getElementById("answerBtn").disabled = false
  }

  async submitAnswer() {
    if (!this.selectedAnswer) return

    const question = this.questions[this.currentQuestionIndex]
    const isCorrect = this.selectedAnswer === question.correct_answer
    const currentPlayer = this.players[this.currentPlayerIndex]

    // Store the answer for this round
    this.roundAnswers.push({
      player: currentPlayer.name,
      answer: this.selectedAnswer,
      isCorrect: isCorrect,
    })

    // Update score if correct (but don't show it yet)
    if (isCorrect) {
      this.players[this.currentPlayerIndex].score++
      const newScore = this.players[this.currentPlayerIndex].score
      localStorage.setItem(`player${this.currentPlayerIndex + 1}`, newScore.toString())
    }

    // Disable all buttons to prevent changes
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      btn.disabled = true
    })
    document.getElementById("answerBtn").disabled = true

    // Show only that the player answered (no correct/incorrect info)
    window.Swal.fire({
      title: "Respuesta Enviada",
      text: `${currentPlayer.name} ha enviado su respuesta.`,
      icon: "info",
      timer: 1000,
      showConfirmButton: false,
    })

    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length

    // Check if round is complete (all players answered this question)
    if (this.currentPlayerIndex === 0) {
      // Round complete - show results and update scores
      await this.showRoundResults()
      this.updateAllScores() // Update UI scores after showing results
      this.currentQuestionIndex++
    }

    // Continue to next turn after delay
    setTimeout(() => {
      this.updateCurrentPlayer()
      this.loadQuestion()
    }, 1500)
  }

  async showRoundResults() {
    const question = this.questions[this.currentQuestionIndex]

    // Count correct answers
    const correctAnswers = this.roundAnswers.filter((answer) => answer.isCorrect).length

    // Create results HTML with suspense
    let resultsHTML = `
      <div class="text-start">
        <h5 class="mb-3"><i class="fas fa-question-circle me-2"></i>Pregunta:</h5>
        <p class="mb-3 fw-bold">${question.question}</p>
      
        <h5 class="mb-3 text-success"><i class="fas fa-check-circle me-2"></i>Respuesta Correcta:</h5>
        <div class="alert alert-success text-center mb-4">
          <h4 class="mb-0">${question.correct_answer}</h4>
        </div>
      
        <div class="text-center mb-3">
          <span class="badge bg-info fs-6 p-2">
            ${correctAnswers} de ${this.players.length} jugadores respondieron correctamente
          </span>
        </div>
      
        <h5 class="mb-3"><i class="fas fa-users me-2"></i>Resultados de la Ronda:</h5>
        <div class="list-group">
    `

    this.roundAnswers.forEach((playerAnswer) => {
      const iconClass = playerAnswer.isCorrect ? "fa-check text-success" : "fa-times text-danger"
      const bgClass = playerAnswer.isCorrect ? "list-group-item-success" : "list-group-item-danger"
      const resultText = playerAnswer.isCorrect ? "¡CORRECTO!" : "Incorrecto"
      const resultBadge = playerAnswer.isCorrect
        ? '<span class="badge bg-success">+1 punto</span>'
        : '<span class="badge bg-danger">0 puntos</span>'

      resultsHTML += `
        <div class="list-group-item ${bgClass}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${playerAnswer.player}</strong>
              <br>
              <small class="text-muted">Respondió: "${playerAnswer.answer}"</small>
              <br>
              <strong class="${playerAnswer.isCorrect ? "text-success" : "text-danger"}">${resultText}</strong>
            </div>
            <div class="text-end">
              <i class="fas ${iconClass} fa-lg mb-1"></i>
              <br>
              ${resultBadge}
            </div>
          </div>
        </div>
      `
    })

    resultsHTML += "</div></div>"

    // Show results modal with more excitement
    await window.Swal.fire({
      title: "🎯 Resultados de la Ronda",
      html: resultsHTML,
      icon: "info",
      confirmButtonText: "Continuar al Siguiente Turno",
      confirmButtonColor: "#007bff",
      width: "700px",
      customClass: {
        popup: "text-start",
      },
      showClass: {
        popup: "animate__animated animate__fadeInDown",
      },
    })
  }

  updateAllScores() {
    // Update all player scores in the UI
    this.players.forEach((player, index) => {
      document.getElementById(`score-${index}`).textContent = player.score

      // Add celebration effect for players who got it right in this round
      const playerGotItRight = this.roundAnswers.find((answer) => answer.player === player.name && answer.isCorrect)

      if (playerGotItRight) {
        const playerCard = document.getElementById(`player-${index}`)
        playerCard.style.animation = "pulse 0.8s ease-in-out"
        setTimeout(() => {
          playerCard.style.animation = ""
        }, 800)
      }
    })
  }

  updateCurrentPlayer() {
    // Remove active class from all player cards
    document.querySelectorAll(".player-card").forEach((card) => {
      card.classList.remove("active")
    })

    // Add active class to current player
    if (this.currentPlayerIndex < this.players.length) {
      document.getElementById(`player-${this.currentPlayerIndex}`).classList.add("active")
      document.getElementById("currentPlayerName").textContent = this.players[this.currentPlayerIndex].name
    }
  }

  async endGame() {
    // Find winner(s)
    const maxScore = Math.max(...this.players.map((p) => p.score))
    const winners = this.players.filter((p) => p.score === maxScore)

    // Sort players by score (descending)
    const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score)

    // Create final results HTML
    let finalResultsHTML = `
      <div class="text-center mb-4">
        <i class="fas fa-trophy text-warning" style="font-size: 3rem;"></i>
      </div>
    `

    if (winners.length > 1) {
      finalResultsHTML += `
        <h3 class="text-center mb-4">¡Empate!</h3>
        <p class="text-center mb-4">Los siguientes jugadores empataron con ${maxScore} aciertos:</p>
        <div class="text-center mb-4">
      `
      winners.forEach((winner) => {
        finalResultsHTML += `<span class="badge bg-warning text-dark me-2 p-2">${winner.name}</span>`
      })
      finalResultsHTML += "</div>"
    } else {
      finalResultsHTML += `
        <h3 class="text-center mb-4">¡${winners[0].name} es el Ganador!</h3>
        <p class="text-center mb-4">Con un total de ${maxScore} aciertos</p>
      `
    }

    finalResultsHTML += `
      <h5 class="mb-3">Puntuaciones Finales:</h5>
      <div class="list-group">
    `

    sortedPlayers.forEach((player, index) => {
      const isWinner = player.score === maxScore
      const badgeClass = isWinner ? "bg-warning text-dark" : "bg-secondary"
      const itemClass = isWinner ? "list-group-item-warning" : ""

      finalResultsHTML += `
        <div class="list-group-item ${itemClass}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <span class="badge ${badgeClass} me-2">${index + 1}°</span>
              <strong>${player.name}</strong>
            </div>
            <span class="badge bg-primary">${player.score} aciertos</span>
          </div>
        </div>
      `
    })

    finalResultsHTML += "</div>"

    // Show final results
    const result = await window.Swal.fire({
      title: "¡Juego Terminado!",
      html: finalResultsHTML,
      icon: "success",
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-redo me-2"></i>Jugar Otra Partida',
      cancelButtonText: '<i class="fas fa-home me-2"></i>Volver al Inicio',
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      width: "600px",
    })

    if (result.isConfirmed) {
      this.resetGame()
    } else {
      this.goToHome()
    }
  }

  resetGame() {
    // Clear localStorage
    for (let i = 1; i <= this.gameConfig.numPlayers; i++) {
      localStorage.removeItem(`player${i}`)
    }
    localStorage.removeItem("triviaQuestions")
    localStorage.removeItem("gameConfig")

    // Reset game state
    this.players = []
    this.questions = []
    this.currentQuestionIndex = 0
    this.currentPlayerIndex = 0
    this.selectedAnswer = null
    this.roundAnswers = []

    // Show start section
    this.goToHome()

    // Reset form
    document.getElementById("configForm").reset()
    document.getElementById("numPlayers").value = "2"
    document.getElementById("numQuestions").value = "10"
  }

  goToHome() {
    // Hide game section and show start section
    document.getElementById("gameSection").style.display = "none"
    document.getElementById("startSection").style.display = "block"

    // Hide any open modals
    const winnerModal = this.bootstrap.Modal.getInstance(document.getElementById("winnerModal"))
    if (winnerModal) winnerModal.hide()
  }

  showLoading(show) {
    const loadingSpinner = document.querySelector(".loading-spinner")
    if (show) {
      loadingSpinner.style.display = "block"
    } else {
      loadingSpinner.style.display = "none"
    }
  }
}

// Initialize game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TriviaGame()
})

// Add some CSS animations
const style = document.createElement("style")
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
    .swal2-popup {
        border-radius: 15px !important;
    }
    
    .list-group-item-success {
        background-color: rgba(25, 135, 84, 0.1) !important;
        border-color: rgba(25, 135, 84, 0.2) !important;
    }
    
    .list-group-item-danger {
        background-color: rgba(220, 53, 69, 0.1) !important;
        border-color: rgba(220, 53, 69, 0.2) !important;
    }
    
    .list-group-item-warning {
        background-color: rgba(255, 193, 7, 0.1) !important;
        border-color: rgba(255, 193, 7, 0.2) !important;
    }
`
document.head.appendChild(style)
