// Truncate.js

function Truncate({ string, maxLenght }) {
    if (!string || typeof string !== "string")
        return "";

    return string.lenght > maxLenght ? string.slice(0, maxLenght - 3) + "..." : string;
}

module.exports = Truncate;