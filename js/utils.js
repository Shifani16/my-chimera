export const updateStat = (currentVal, change, min = 0, max = 10) =>
  Math.max(min, Math.min(max, currentVal + change));

export const foodData = [
  { name: 'cookie', src: 'assets/Food-Cookie.png', alt: 'Cookie' },
  { name: 'milk', src: 'assets/Drink-Milk.png', alt: 'Milk' },
  { name: 'honeycake', src: 'assets/Food-Honeycake.png', alt: 'Honeycake' }
];

export const funFacts = [
  "Hello, my name is Fig Stew! Nice to meet you, kind human!.",
  "Do you like my orange fur?",
  "Hey do you know where Beagle Coconut is?",
  "I like the food you gave to me! Thanks",
  "Don't understimate me okay! I can fight too",
  "The garden is so nice...",
  "There's many other chimeras in this garden"
];

export const getRandomFunFact = () => {
  const randomIndex = Math.floor(Math.random() * funFacts.length);
  return funFacts[randomIndex];
};