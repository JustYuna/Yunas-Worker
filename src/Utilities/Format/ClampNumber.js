// ClampNumber.js

function CLAMP({ value, min, max }) {
    return Math.min(Math.max(value, min), max);
}

module.exports = CLAMP