// Capitalize.js

function Capitalize({ string, array }) {
    const capitalizeString = (value) => {
        if (typeof value !== "string" || value.length === 0)
            return "";

        return value.charAt(0).toUpperCase() +
            value.slice(1).toLowerCase();
    };

    if (typeof string === "string")
        return capitalizeString(string);

    if (Array.isArray(array))
        return array.map(capitalizeString);

    return "";
}

module.exports = Capitalize;