const { createMachine, assign } = XState;
import { updateStat, getRandomFunFact } from './utils.js';

const assignMood = (mood) => assign({ mood: () => mood });

const assignEnergy = (energyChange) => assign({
  energy: (context) => updateStat(context.energy, energyChange)
});

const assignHunger = (hungerChange) => assign({
  hunger: (context) => updateStat(context.hunger, hungerChange)
});

const trackFood = assign({
  lastFood: (context, event) => event.food,
  consecutiveSameFoodCount: (context, event) =>
    context.lastFood === event.food ? context.consecutiveSameFoodCount + 1 : 1,
});

const assignRandomFunFact = assign({
  currentFunFact: () => getRandomFunFact(),
});

const isUnhealthyForGrumpy = (context) => {
  const unhealthy = context.hunger >= 5 || context.energy <= 5;
  console.log(`Checking if grumpy: Hunger ${context.hunger}, Energy ${context.energy} -> ${unhealthy}`);
  return unhealthy;
};

const isUnhealthyForSick = (context) => {
  const sick = context.hunger >= 8 || context.energy <= 2;
  console.log(`Checking if sick: Hunger ${context.hunger}, Energy ${context.energy} -> ${sick}`);
  return sick;
};

const isHealthy = (context) => {
  const healthy = context.hunger < 5 && context.energy > 5;
  console.log(`Checking if healthy: Hunger ${context.hunger}, Energy ${context.energy} -> ${healthy}`);
  return healthy;
};

const isEnergySufficientForPlay = (context) => {
  const sufficient = context.energy > 5;
  console.log(`Checking if energy sufficient for play: Energy ${context.energy} -> ${sufficient}`);
  return sufficient;
};

let actionButtonsContainer;
let feedCarouselContainer;
let feedCarousel;
let currentFoodOrder;
let updateCarouselViewFn; 

export const setUIElementsForMachine = (elements, updateCarouselFunc) => {
  actionButtonsContainer = elements.actionButtonsContainer;
  feedCarouselContainer = elements.feedCarouselContainer;
  feedCarousel = elements.feedCarousel;
  currentFoodOrder = elements.currentFoodOrder;
  updateCarouselViewFn = updateCarouselFunc;
};

export const chimeraMachine = createMachine(
  {
    context: {
      mood: "normal",
      energy: 10,
      hunger: 0,
      lastFood: null,
      consecutiveSameFoodCount: 0,
      currentFunFact: "",
    },
    id: "My Chimera",
    initial: "healthy_mood_normal",
    states: {
      paused: {
        description: "The game is paused.",
        on: {
          TOGGLE_PAUSE: "healthy_mood_normal",
          RESTART_GAME: {
            target: 'healthy_mood_normal',
            actions: 'triggerRestartFromPause' 
          }
        }
      },
      healthy_mood_normal: {
        description:
          "Chimera akan berada di state idle, sedang tidak berinteraksi atau menunjukkan perilaku tidak normal. Mood yang ditunjukkan sedang normal.",
        on: {
          play: {
            target: "playing",
            actions: [assignEnergy(-3), assignMood("happy"), "assignRandomFunFact"],
            cond: "isEnergySufficientForPlay",
          },
          feed: {
            target: "food_selection",
          },
          makes_sleep: {
            target: "enough_sleep",
            actions: [assignEnergy(3)],
          },
          time_check: [
            {
              target: "mood_grumpy",
              cond: "is_unhealthy_for_grumpy",
              actions: [assignEnergy(-1), assignHunger(1), assignMood("grumpy")],
              description: "If stats are unhealthy on periodic check, become grumpy and degrade stats slightly."
            },
            {
              actions: [assignEnergy(-1), assignHunger(1)],
            }
          ],
          TOGGLE_PAUSE: "paused"
        },
      },
      playing: {
        description:
          "Chimera is happy and actively playing for a short period. Other events (like time_check) are ignored.",
        after: {
          5000: {
            target: "recovered_status",
          },
        },
        on: {
          time_check: undefined,
          TOGGLE_PAUSE: "paused"
        }
      },

      food_selection: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan honeycake",
        entry: 'showFeedCarousel',
        exit: 'hideFeedCarousel',
        on: {
          player_selecting: {
            target: "stomach_full",
            actions: [assignHunger(-3), "trackFood"],
          },
          CANCEL_FEED: { target: 'healthy_mood_normal' },
          TOGGLE_PAUSE: "paused"
        },
      },
      enough_sleep: {
        description:
          "Chimera akan berada di state cukup tidur. Tidak akan rentan terhadap penyakit.",
        after: {
          5000: {
            target: "healthy_mood_normal",
          },
        },
        on: {
          TOGGLE_PAUSE: "paused"
        }
      },
      mood_grumpy: {
        description:
          "Chimera akan berada di state grumpy. Chimera akan menunjukkan perilaku tidak senang",
        on: {
          time_check: [
            {
              target: "sick_mood_grumpy",
              cond: "is_unhealthy_for_sick",
              actions: [assignEnergy(-1), assignHunger(1)],
              description: "If still unhealthy while grumpy on periodic check, become sick."
            },
            {
              actions: [assignEnergy(-1), assignHunger(1)]
            }
          ],
          play: {
            target: "playing",
            actions: [assignEnergy(-3), assignMood("happy"), "assignRandomFunFact"],
            cond: "isEnergySufficientForPlay",
          },
          makes_sleep: {
            target: "recovered_status",
            actions: [assignEnergy(3)],
          },
          feed: {
            target: "food_selection_grumpy",
          },
          TOGGLE_PAUSE: "paused"
        },
      },
      stomach_full: {
        description:
          "Chimera akan berada di state dimana perutnya kenyang. Tidak kelaparan",
        after: {
          5000: {
            target: "healthy_mood_normal",
          },
        },
        on: {
          repeat_same_food_3_times: {
            target: "mood_grumpy",
            actions: assign((context) => ({
              mood: 'grumpy',
              hunger: updateStat(context.hunger, 5),
              energy: updateStat(context.energy, -5),
            })),
          },
          TOGGLE_PAUSE: "paused"
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
        after: {
          100: [
          {
            target: "healthy_mood_normal",
            cond: "is_healthy",
          },
          {
            target: "mood_grumpy",
            cond: "is_unhealthy_for_grumpy",
          },
          {
            target: "mood_grumpy"
          }
          ]
        },
        on: {
          TOGGLE_PAUSE: "paused"
        }
      },
      food_selection_grumpy: {
        description:
          "Player dapat memilih beberapa jenis makanan seperti cookies, milk, dan honeycake",
        entry: 'showFeedCarousel',
        exit: 'hideFeedCarousel',
        on: {
          player_selecting: {
            target: "recovered_status",
            actions: [assignHunger(-3), "trackFood"],
          },
          CANCEL_FEED: { target: 'mood_grumpy' },
          TOGGLE_PAUSE: "paused"
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    actions: {
      mood: assignMood,
      energy: assignEnergy,
      hunger: assignHunger,
      trackFood: trackFood,
      assignRandomFunFact: assignRandomFunFact,
      showFeedCarousel: () => {
        if (actionButtonsContainer)
          actionButtonsContainer.style.display = 'none';
        if (feedCarouselContainer) feedCarouselContainer.style.display = 'flex';
        updateCarouselViewFn();
      },
      hideFeedCarousel: () => {
        if (feedCarouselContainer) feedCarouselContainer.style.display = 'none';
        if (actionButtonsContainer) actionButtonsContainer.style.display = 'flex';
      },
      triggerRestartFromPause: (context, event, meta) => {
        console.log('Triggering restart from paused state via action.');
      },
    },
    guards: {
      is_unhealthy_for_grumpy: isUnhealthyForGrumpy,
      is_unhealthy_for_sick: isUnhealthyForSick,
      is_healthy: isHealthy,
      isEnergySufficientForPlay: isEnergySufficientForPlay,
    },
  }
);