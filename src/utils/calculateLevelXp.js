/**
 * XP needed to finish the given level. Grows with the square of the level, so each level takes
 * longer than the one before: 100 XP at level 0, 1100 at level 10, 3100 at level 20.
 */
module.exports = (level) => 5 * level * level + 50 * level + 100;
