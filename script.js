const { createMachine, interpret, assign } = XState;

const machine = createMachine(
  {
    context: {
      mood: "normal",
      energy: 10,
      hunger: 0,
      lastFood: null,
      consecutiveSameFoodCount: 0,
    },
    id: "My Chimera",
    initial: "healthy_mood_normal",
    states: {
      healthy_mood_normal: {
        description:
          "Chimera akan berada di state idle, sedang tidak berinteraksi atau  menunjukkan perilaku tidak normal. Mood yang ditunjukkan sedang normal.",
        on: {
          play: [
            {
              target: "mood_happy",
              actions: [
                { type: "energy", params: { energy: -3 } },
                { type: "mood", params: { mood: "happy" } },
              ],
            },
          ],
          feed: [
            {
              target: "food_selection",
            },
          ],
          makes_sleep: [
            {
              target: "enough_sleep",
              actions: [
                { type: "energy", params: { energy: 3 } },
              ],
            },
          ],
          time_check: [
            {
              target: "mood_grumpy",
              cond: "is_unhealthy_for_grumpy",
              actions: [
                { type: "energy", params: { energy: -1 } },
                { type: "hunger", params: { hunger: 1 } },
                { type: "mood", params: { mood: "grumpy" } },
              ],
              description: "If stats are unhealthy on periodic check, become grumpy and degrade stats slightly."
            },
            {
              actions: [
                { type: "energy", params: { energy: -1 } },
                { type: "hunger", params: { hunger: 1 } },
              ]
            }
          ],
        },
      },
      mood_happy: {
        description:
          "Chimera akan berada di state bahagia setelah bermain.",
        after: {
          5000: {
            target: "healthy_mood_normal",
            actions: [],
          },
        },
      },
      food_selection: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan fruits",
        entry: 'showFeedOptions',
        exit: 'hideFeedOptions',
        on: {
          player_selecting: [
            {
              target: "stomach_full",
              actions: [
                { type: "hunger", params: { hunger: -3 } },
                "trackFood",
              ],
            },
          ],
        },
      },
      enough_sleep: {
        description:
          "Chimera akan berada di state cukup tidur. Tidak akan rentan terhadap penyakit.",
        after: {
          5000: {
            target: "healthy_mood_normal",
            actions: [],
          },
        },
      },
      mood_grumpy: {
        description:
          "Chimera akan berada di state grumpy. Chimera akan menunjukkan perilaku tidak senang",
        on: {
          time_check: [
            {
              target: "sick_mood_grumpy",
              cond: "is_unhealthy_for_sick",
              actions: [
                { type: "energy", params: { energy: -2 } },
                { type: "hunger", params: { hunger: 2 } },
              ],
              description: "If still unhealthy while grumpy on periodic check, become sick."
            },
            {
              actions: [
                { type: "energy", params: { energy: -1 } },
                { type: "hunger", params: { hunger: 1 } },
              ]
            }
          ],
          play: [
            {
              target: "recovered_status",
              actions: [
                { type: "energy", params: { energy: -3 } },
                { type: "mood", params: { mood: "happy" } },
              ],
            },
          ],
          makes_sleep: [
            {
              target: "recovered_status",
              actions: [
                { type: "energy", params: { energy: 3 } },
              ],
            },
          ],
          feed: [
            {
              target: "food_selection_grumpy",
            },
          ],
        },
      },
      stomach_full: {
        description:
          "Chimera akan berada di state dimana perutnya kenyang. Tidak kelaparan",
        after: {
          5000: {
            target: "healthy_mood_normal",
            actions: [],
          },
        },
        on: {
          repeat_same_food_3_times: [
            {
              target: "mood_grumpy",
              actions: assign((context) => ({
                mood: 'grumpy',
                hunger: Math.min(10, context.hunger + 5),
                energy: Math.max(0, context.energy - 5),
              })),
            },
          ],
        },
      },
      sick_mood_grumpy: {
        description:
          "Chimera akan berada di state sakit. Chimera tidak bahagia dan dalam keadaan yang tidak baik-baik saja. Virtual pet berakhir",
        type: 'final'
      },
      recovered_status: {
        description:
          "Status akan berganti secara dinamis sesuai dengan opsi yang dipilih player untuk memulihkan status",
        on: {
          status_check: [
            {
              target: "healthy_mood_normal",
              cond: "is_healthy",
              actions: [],
            },
            {
              target: "mood_grumpy",
              cond: "is_unhealthy_for_grumpy",
              actions: [],
            },
          ],
        },
      },
      food_selection_grumpy: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan fruits",
        entry: 'showFeedOptions',
        exit: 'hideFeedOptions',
        on: {
          player_selecting: [
            {
              target: "recovered_status",
              actions: [
                { type: "hunger", params: { hunger: -3 } },
                "trackFood",
              ],
            },
          ],
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
      mood: assign({
        mood: (context, event, meta) => {
          const newMood = meta.action.params.mood;
          console.log(`Action 'mood' triggered. New Mood: ${newMood}`);
          return newMood;
        }
      }),
      energy: assign({
        energy: (context, event, meta) => {
          const energyChange = meta.action.params.energy;
          const newEnergy = Math.max(0, Math.min(10, context.energy + energyChange));
          console.log(`Action 'energy' triggered. Change: ${energyChange}, New Energy: ${newEnergy}`);
          return newEnergy;
        }
      }),
      hunger: assign({
        hunger: (context, event, meta) => {
          const hungerChange = meta.action.params.hunger;
          const newHunger = Math.max(0, Math.min(10, context.hunger + hungerChange));
          console.log(`Action 'hunger' triggered. Change: ${hungerChange}, New Hunger: ${newHunger}`);
          return newHunger;
        }
      }),
      showFeedOptions: () => {
        const feedOptions = document.getElementById('feed-options');
        if (feedOptions) feedOptions.style.display = 'flex';
      },
      hideFeedOptions: () => {
        const feedOptions = document.getElementById('feed-options');
        if (feedOptions) feedOptions.style.display = 'none';
      },
      trackFood: assign({
        lastFood: (context, event) => event.food,
        consecutiveSameFoodCount: (context, event) => {
          if (context.lastFood === event.food) {
            return context.consecutiveSameFoodCount + 1;
          } else {
            return 1;
          }
        }
      }),
    },
    guards: {
      is_unhealthy_for_grumpy: (context) => {
        const unhealthy = context.hunger >= 5 || context.energy <= 5;
        console.log(`Checking if unhealthy for grumpy: Hunger ${context.hunger}, Energy ${context.energy} -> ${unhealthy}`);
        return unhealthy;
      },
      is_unhealthy_for_sick: (context) => {
        const sick = context.hunger >= 8 || context.energy <= 2;
        console.log(`Checking if unhealthy for sick: Hunger ${context.hunger}, Energy ${context.energy} -> ${sick}`);
        return sick;
      },
      is_healthy: (context) => {
        const healthy = context.hunger < 5 && context.energy > 5;
        console.log(`Checking if healthy: Hunger ${context.hunger}, Energy ${context.energy} -> ${healthy}`);
        return healthy;
      },
      after_10m: (context, event) => {
        return false;
      },
      context_below_5: (context, event) => {
        return context.hunger >= 5 || context.energy <= 5;
      },
      "hungry < 5 or energy > 5": (context, event) => {
        return context.hunger < 5 || context.energy > 5;
      },
      "hungry > 5 or energy < 5": (context, event) => {
        return context.hunger > 5 || context.energy < 5;
      },
      isThreeConsecutiveSameFood: (context) => {
        return context.consecutiveSameFoodCount >= 3;
      }
    },
    delays: {},
    services: {},
  }
);

const hungerElement = document.getElementById('hunger');
const energyValueElement = document.getElementById('energy-value');
const energyFillElement = document.getElementById('energy-fill');
const statusTextSpan = document.querySelector('#status .status-text');

const feedButton = document.getElementById('feed-button');
const playButton = document.getElementById('play');
const sleepButton = document.getElementById('sleep');
const feedOptionsDiv = document.getElementById('feed-options');
const foodOptionButtons = document.querySelectorAll('.food-option');

const splashScreen = document.getElementById('splash-screen');
const container = document.querySelector('.container');
const chimeraImageElement = document.querySelector('.chimera');
const retryMainButton = document.getElementById('retry-main-button'); 

let service;
let periodicCheckInterval;

function updateEnergyBar(value) {
    if (!energyFillElement || !energyValueElement) {
        console.error("Energy bar elements not found!");
        return;
    }
    const percent = Math.max(0, Math.min(value * 10, 100));
    energyFillElement.style.width = percent + "%";
    energyValueElement.textContent = value;

    if (value <= 2) {
        energyFillElement.style.backgroundColor = 'red';
    } else if (value <= 5) {
        energyFillElement.style.backgroundColor = 'orange';
    } else {
        energyFillElement.style.backgroundColor = 'green';
    }
}

function updateUI(state) {
    console.log('Current State:', state.value);
    console.log('Current Context:', state.context);

    if (hungerElement) {
        hungerElement.textContent = state.context.hunger;
        if (state.context.hunger >= 8) {
            hungerElement.style.color = 'red';
        } else if (state.context.hunger >= 5) {
            hungerElement.style.color = 'orange';
        } else {
            hungerElement.style.color = 'inherit';
        }
    } else {
        console.error("Hunger element not found!");
    }

    updateEnergyBar(state.context.energy);

    let statusText = "[DOING FINE]";
    let statusClass = "fine";
    let chimeraImgSrc = "assets/Chimera-Idle.gif";

    if (feedButton) feedButton.disabled = false;
    if (playButton) playButton.disabled = false;
    if (sleepButton) sleepButton.disabled = false;
    if (retryMainButton) retryMainButton.style.display = 'block'; 

    const existingGameOverDiv = document.getElementById('game-over-message');
    if (existingGameOverDiv) {
        existingGameOverDiv.remove();
    }

    if (state.matches('healthy_mood_normal')) {
        statusText = "[DOING FINE]";
        statusClass = "fine";
        chimeraImgSrc = "assets/Chimera-Idle.gif";
    } else if (state.matches('mood_happy')) {
        statusText = "[HAPPY]";
        statusClass = "happy";
        chimeraImgSrc = "assets/Chimera-Idle-Confused.gif";
    } else if (state.matches('stomach_full')) {
        statusText = "[FULL]";
        statusClass = "full";
        chimeraImgSrc = "assets/Chimera-Happy.gif";
    } else if (state.matches('enough_sleep')) {
        statusText = "[RESTED]";
        statusClass = "rested";
        chimeraImgSrc = "assets/Chimera-Sleep.gif";
    } else if (state.matches('mood_grumpy')) {
        statusText = "[GRUMPY]";
        statusClass = "grumpy";
        chimeraImgSrc = "assets/Chimera-Angy.gif";
    } else if (state.matches('sick_mood_grumpy')) {
        statusText = "[SICK]";
        statusClass = "sick";
        chimeraImgSrc = "assets/Chimera-Sick.gif";

        if (feedButton) feedButton.disabled = true;
        if (playButton) playButton.disabled = true;
        if (sleepButton) sleepButton.disabled = true;
        if (retryMainButton) retryMainButton.style.display = 'none';

        clearInterval(periodicCheckInterval);
        periodicCheckInterval = null;
        console.log("Game Over: Chimera is sick.");
        
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-message';
        gameOverDiv.innerHTML = `
            <p>Your Chimera is sick! Game Over.</p>
            <button id="retry-game-over-button" class="retry-button">RETRY</button>
        `;
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 30px;
            border-radius: 15px;
            font-size: 1.5em;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        `;
        document.body.appendChild(gameOverDiv);

        const retryGameOverButton = document.getElementById('retry-game-over-button');
        if (retryGameOverButton) {
            retryGameOverButton.addEventListener('click', restartGame);
        }
    } else if (state.matches('recovered_status')) {
        if (state.context.hunger < 5 && state.context.energy > 5) {
            statusText = "[DOING FINE]";
            statusClass = "fine";
            chimeraImgSrc = "assets/Chimera-Idle.gif";
        } else {
            statusText = "[RECOVERING]";
            statusClass = "grumpy";
            chimeraImgSrc = "assets/Chimera-Idle-Confused.gif";
        }
    }

    if (statusTextSpan) {
        statusTextSpan.textContent = statusText;
        statusTextSpan.classList.remove('fine', 'happy', 'full', 'rested', 'grumpy', 'sick');
        statusTextSpan.classList.add(statusClass);
    } else {
        console.error("Status text span element not found!");
    }

    if (chimeraImageElement) {
        chimeraImageElement.src = chimeraImgSrc;
    } else {
        console.error("Chimera image element not found!");
    }
}

function startGame() {
    splashScreen.style.display = 'none';
    container.style.display = 'block';

    service = interpret(machine)
        .onTransition(state => {
            updateUI(state);
            if (state.changed && (state.matches('recovered_status'))) {
                service.send('status_check');
            }
            if (state.matches('stomach_full') && state.context.consecutiveSameFoodCount > 3) {
                console.log("Sending 'repeat_same_food_3_times' event from stomach_full...");
                service.send('repeat_same_food_3_times');
            }
        })
        .start();

    updateUI(service.state);

    if (periodicCheckInterval) {
        clearInterval(periodicCheckInterval); 
    }
    periodicCheckInterval = setInterval(() => {
        console.log("Sending 'time_check' event...");
        service.send('time_check');
    }, 5000);
}

function restartGame() {
    console.log("Restarting game...");
    if (service) {
        service.stop(); 
    }
    if (periodicCheckInterval) {
        clearInterval(periodicCheckInterval); 
        periodicCheckInterval = null;
    }

    updateEnergyBar(10); 
    if (hungerElement) hungerElement.textContent = 0; 
    if (statusTextSpan) {
        statusTextSpan.textContent = "[DOING FINE]";
        statusTextSpan.classList.remove('happy', 'full', 'rested', 'grumpy', 'sick');
        statusTextSpan.classList.add('fine');
    }
    if (chimeraImageElement) chimeraImageElement.src = "assets/Chimera-Idle.gif";

    const existingGameOverDiv = document.getElementById('game-over-message');
    if (existingGameOverDiv) {
        existingGameOverDiv.remove();
    }

    if (feedButton) feedButton.disabled = false;
    if (playButton) playButton.disabled = false;
    if (sleepButton) sleepButton.disabled = false;
    if (retryMainButton) retryMainButton.style.display = 'block'; 

    startGame();
}


if (splashScreen && container) {
    splashScreen.addEventListener('click', startGame);
} else {
    console.error("Splash screen or container element not found!");
}

if (feedButton) {
    feedButton.addEventListener('click', () => {
        if (service) service.send('feed');
    });
} else { console.error("Feed button not found!"); }

foodOptionButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const foodType = event.target.dataset.food;
        console.log(`Selected food: ${foodType}`);
        if (service) {
            service.send('player_selecting', { food: foodType });
        }
    });
});

if (playButton) {
    playButton.addEventListener('click', () => {
        if (service) service.send('play');
    });
} else { console.error("Play button not found!"); }

if (sleepButton) {
    sleepButton.addEventListener('click', () => {
        if (service) service.send('makes_sleep');
    });
} else { console.error("Sleep button not found!"); }

if (retryMainButton) {
    retryMainButton.addEventListener('click', restartGame);
} else {
    console.error("Retry main button not found!");
}


if (container) {
    container.style.display = 'none';
}