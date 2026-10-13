const economySchema = require('../schemas/economySchema');
const exoticAnimalSchema = require('../schemas/exoticAnimalSchema');
const { rarities } = require('./animals');
const { getSpeciesEmoji } = require('./dailyShop');
const { randomInt } = require('./economy');

const MAX_HP = 100;
const MAX_TURNS = 40;
const MAX_FIGHTERS = 25;
const READ_EXOTIC_COUNT = 100;

const BASE_DAMAGE = 22;
const DAMAGE_PER_POWER = 0.08;
const DAMAGE_SPREAD_PERCENT = 50;
const BASE_CRIT_PERCENT = 8;
const CRIT_PERCENT_PER_LUCK = 0.25;
const CRIT_MULTIPLIER = 2;
const DODGE_PERCENT_PER_SPEED = 0.2;

/** True with the given chance in percent. */
const rollPercent = (percent) => randomInt(0, 9999) < percent * 100;

/**
 * Every animal the member can send to a duel: one entry per hunted species they hold and one per
 * shop animal, strongest first, cut to what a select menu can show. Read from the database each time,
 * so a choice is always checked against what the member really owns.
 * @returns {Promise<{ key: string, emoji: string, name: string, power: number, speed: number, luck: number }[]>}
 */
const getFighters = async (t, guildID, userID) => {
    const [account, exotics] = await Promise.all([
        economySchema.findOne({ guildID, userID }, { animals: 1 }).lean(),
        exoticAnimalSchema.find({ guildID, userID }).sort({ price: -1 }).limit(READ_EXOTIC_COUNT).lean(),
    ]);

    const fighters = [];

    for (const rarity of rarities) {
        for (const animal of rarity.animals) {
            if (!(account?.animals?.[animal.id] > 0)) continue;

            fighters.push({
                key: `h:${animal.id}`,
                emoji: animal.emoji,
                name: t(`animal.${animal.id}`),
                power: animal.power,
                speed: animal.speed,
                luck: animal.luck,
            });
        }
    }

    for (const exotic of exotics) {
        fighters.push({
            key: `e:${exotic._id}`,
            emoji: getSpeciesEmoji(exotic.species),
            name: `${t(`shop.tier.${exotic.tier}`)} ${t(`shop.species.${exotic.species}`)}`,
            power: exotic.power,
            speed: exotic.speed,
            luck: exotic.luck,
        });
    }

    fighters.sort((a, b) => (b.power + b.speed + b.luck) - (a.power + a.speed + a.luck));
    return fighters.slice(0, MAX_FIGHTERS);
};

/**
 * Fights two animals turn by turn until one has no HP left. The faster animal strikes first.
 * Power raises damage, luck raises the critical hit chance, speed raises the chance to dodge.
 * @returns {{ winner: 0 | 1, turns: { attacker: 0 | 1, type: 'hit' | 'crit' | 'dodge', damage: number, hp: [number, number] }[] }}
 */
const simulateBattle = (first, second) => {
    const fighters = [first, second];
    const hp = [MAX_HP, MAX_HP];
    const turns = [];

    let attacker = first.speed === second.speed ? randomInt(0, 1) : Number(second.speed > first.speed);

    while (hp[0] > 0 && hp[1] > 0 && turns.length < MAX_TURNS) {
        const defender = 1 - attacker;
        let type = 'hit';
        let damage = 0;

        if (rollPercent(fighters[defender].speed * DODGE_PERCENT_PER_SPEED)) {
            type = 'dodge';
        } else {
            const spread = (100 + randomInt(-DAMAGE_SPREAD_PERCENT, DAMAGE_SPREAD_PERCENT)) / 100;
            damage = (BASE_DAMAGE + fighters[attacker].power * DAMAGE_PER_POWER) * spread;

            if (rollPercent(BASE_CRIT_PERCENT + fighters[attacker].luck * CRIT_PERCENT_PER_LUCK)) {
                type = 'crit';
                damage *= CRIT_MULTIPLIER;
            }

            damage = Math.max(1, Math.round(damage));
            hp[defender] = Math.max(0, hp[defender] - damage);
        }

        turns.push({ attacker, type, damage, hp: [hp[0], hp[1]] });
        attacker = defender;
    }

    let winner = Number(hp[1] > hp[0]);
    if (hp[0] === hp[1]) winner = randomInt(0, 1);

    return { winner, turns };
};

module.exports = { MAX_HP, getFighters, simulateBattle };
