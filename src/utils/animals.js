const crypto = require('crypto');

/**
 * Hunt table. `weight` is the relative chance of the rarity, `price` is the sell value of one animal.
 * `power`, `speed` and `luck` (1 to 100) are the animal's duel stats.
 * Animal ids are stored as Map keys in the economy account, so an id never changes once it is released.
 */
const rarities = [
    {
        id: 'yaygin', name: 'Yaygın', weight: 60, price: 3,
        animals: [
            { id: 'tavsan', emoji: '🐇', name: 'Tavşan', power: 8, speed: 30, luck: 15 },
            { id: 'sincap', emoji: '🐿️', name: 'Sincap', power: 6, speed: 28, luck: 18 },
            { id: 'tavuk', emoji: '🐔', name: 'Tavuk', power: 10, speed: 12, luck: 12 },
            { id: 'kurbaga', emoji: '🐸', name: 'Kurbağa', power: 7, speed: 20, luck: 25 },
        ],
    },
    {
        id: 'siradisi', name: 'Sıradışı', weight: 25, price: 10,
        animals: [
            { id: 'tilki', emoji: '🦊', name: 'Tilki', power: 25, speed: 40, luck: 30 },
            { id: 'geyik', emoji: '🦌', name: 'Geyik', power: 28, speed: 45, luck: 15 },
            { id: 'baykus', emoji: '🦉', name: 'Baykuş', power: 22, speed: 35, luck: 40 },
            { id: 'kirpi', emoji: '🦔', name: 'Kirpi', power: 30, speed: 15, luck: 25 },
        ],
    },
    {
        id: 'nadir', name: 'Nadir', weight: 10, price: 30,
        animals: [
            { id: 'kurt', emoji: '🐺', name: 'Kurt', power: 50, speed: 50, luck: 25 },
            { id: 'ayi', emoji: '🐻', name: 'Ayı', power: 65, speed: 25, luck: 20 },
            { id: 'kartal', emoji: '🦅', name: 'Kartal', power: 45, speed: 65, luck: 35 },
        ],
    },
    {
        id: 'epik', name: 'Epik', weight: 4, price: 120,
        animals: [
            { id: 'kaplan', emoji: '🐅', name: 'Kaplan', power: 72, speed: 68, luck: 35 },
            { id: 'aslan', emoji: '🦁', name: 'Aslan', power: 78, speed: 55, luck: 40 },
            { id: 'kopekbaligi', emoji: '🦈', name: 'Köpekbalığı', power: 80, speed: 60, luck: 30 },
        ],
    },
    {
        id: 'efsanevi', name: 'Efsanevi', weight: 1, price: 600,
        animals: [
            { id: 'ejderha', emoji: '🐉', name: 'Ejderha', power: 95, speed: 70, luck: 60 },
            { id: 'tekboynuz', emoji: '🦄', name: 'Tek Boynuzlu At', power: 70, speed: 85, luck: 95 },
            { id: 'bocek', emoji: '🪲', name: 'Altın Bug', power: 60, speed: 90, luck: 99 },
        ],
    },
];

const totalWeight = rarities.reduce((sum, rarity) => sum + rarity.weight, 0);

/** Picks a random animal, weighted by rarity. */
const rollAnimal = () => {
    let roll = crypto.randomInt(totalWeight);

    for (const rarity of rarities) {
        roll -= rarity.weight;
        if (roll < 0) {
            const animal = rarity.animals[crypto.randomInt(rarity.animals.length)];
            return { animal, rarity };
        }
    }

    const rarity = rarities[0];
    return { animal: rarity.animals[0], rarity };
};

module.exports = { rarities, rollAnimal };
