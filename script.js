const { createMachine, interpret, assign } = XState; 

const machine = createMachine(
  {
    context: {
      mood: "normal",
      energy: 10,
      hunger: 0,
    },
    id: "My Chimera",
    initial: "healthy_mood_normal",
    states: {
      healthy_mood_normal: {
        description:
          "Chimera will be in an idle state, not interacting or showing abnormal behavior. Mood is normal.",
        on: {
          play: {
            target: "mood_happy",
            actions: [
              { type: "energy", params: { energy: -3 } },
            ],
          },
          feed: {
            target: "stomach_full", 
            actions: [
              { type: "hunger", params: { hunger: -3 } }, 
            ],
          },
          makes_sleep: {
            target: "enough_sleep",
            actions: [
              { type: "energy", params: { energy: 3 } },
            ],
          },
          time_check: [
            {
              target: "mood_grumpy",
              cond: "is_unhealthy",
              actions: [
                { type: "energy", params: { energy: -1 } },
                { type: "hunger", params: { hunger: 1 } },  
              ],
               description: "If stats are unhealthy on periodic check, become grumpy and degrade stats slightly."
            },
             {
                 actions: [
                     { type: "energy", params: { energy: -1 } }, // Minor energy drain over time
                     { type: "hunger", params: { hunger: 1 } },  // Minor hunger increase over time
                 ]
             }
          ],
        },
      },
      mood_happy: {
        description:
          "Chimera is happy after playing.",
        after: {
          5000: { 
            target: "healthy_mood_normal",
            actions: [],
          },
        },
      },
      stomach_full: {
        description:
          "Chimera's stomach is full. Not hungry.",
        after: {
          5000: { 
            target: "healthy_mood_normal",
            actions: [],
          },
        },
      },
      enough_sleep: {
        description:
          "Chimera is well-rested. Not prone to sickness.",
        after: {
          5000: { 
            target: "healthy_mood_normal",
            actions: [],
          },
        },
        
      },
      mood_grumpy: {
        description:
          "Chimera is grumpy. Will show displeased behavior.",
        on: {
          time_check: [ 
            {
              target: "sick_mood_grumpy",
              cond: "is_unhealthy", 
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
          feed: {
            target: "healthy_mood_normal",
            actions: [
              { type: "hunger", params: { hunger: -3 } },
            ],
          },
          play: {
            target: "healthy_mood_normal", 
            actions: [
               { type: "energy", params: { energy: -3 } },
            ],
          },
          makes_sleep: { 
            target: "healthy_mood_normal", 
            actions: [
              { type: "energy", params: { energy: 3 } },
            ],
          },
        },
      },
      sick_mood_grumpy: {
        description:
          "Chimera is sick. Unhappy and not well. Virtual pet ends.",
        type: 'final' 
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
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
    },
    guards: {
      is_unhealthy: (context) => {
          const unhealthy = context.hunger >= 5 || context.energy <= 5;
          console.log(`Checking if unhealthy: Hunger ${context.hunger}, Energy ${context.energy} -> ${unhealthy}`);
          return unhealthy;
      },
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

const splashScreen = document.getElementById('splash-screen');
const container = document.querySelector('.container'); 
const chimeraImageElement = document.querySelector('.chimera'); 

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

  // Update Stats Display
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


  // Update Energy Bar
  updateEnergyBar(state.context.energy);


  // Update Status Text and Appearance
  let statusText = "[DOING FINE]";
  let statusClass = "fine";
  let chimeraImgSrc = "assets/Chimera-Idle.gif";

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

    if(feedButton) feedButton.disabled = true;
    if(playButton) playButton.disabled = true;
    if(sleepButton) sleepButton.disabled = true;

    clearInterval(periodicCheckInterval); 
    periodicCheckInterval = null; 
    console.log("Game Over: Chimera is sick.");
    if (!document.getElementById('game-over-message')) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-message';
        gameOverDiv.textContent = "Your Chimera is sick! Game Over.";
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 1.5em;
            z-index: 10;
        `;
        document.body.appendChild(gameOverDiv);
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


if (splashScreen && container) {
    splashScreen.addEventListener('click', function () {
        splashScreen.style.display = 'none'; 
        container.style.display = 'block'; 

        service = interpret(machine)
          .onTransition(updateUI)
          .start();

        updateUI(service.state);

        periodicCheckInterval = setInterval(() => {
            console.log("Sending 'time_check' event...");
            service.send('time_check');
        }, 5000); 
    });
} else {
     console.error("Splash screen or container element not found!");
}

if (feedButton) {
    feedButton.addEventListener('click', () => {
        if (service) service.send('feed'); 
    });
} else { console.error("Feed button not found!"); }

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


// --- Initial Setup ---
if (container) {
    container.style.display = 'none';
}