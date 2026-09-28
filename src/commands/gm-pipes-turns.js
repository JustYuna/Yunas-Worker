const { diff } = require("node:util");

const Command = {
  data: {
    name: "gm-pipes-turns",
    description: "Calculates required min turns for a level.",
    options: [
      { name: 'straights', type: 4, required: true, description: 'Straight Pipes' },
      { name: 'turns', type: 4, required: true, description: '90deg Turn Pipes' },
      {
        name: "diff",
        description: "Difficulty",
        type: 3,
        required: true,
        choices: [
          { name: "Hard", value: "hard" },
          { name: "Medium", value: "medium" },
          { name: "Easy", value: "easy" }
        ]
      }
    ]
  },
  run: async function (interaction, client) {
    const straights = interaction.options.getInteger("straights");
    const turns = interaction.options.getInteger("turns");
    const difficulty = interaction.options.getString("diff");

    let turns_needed = (straights) + (turns*3);
    switch (difficulty)
    {
      case ("hard"):
        turns_needed *= 0.9;
        break;
      case ("medium"):
        turns_needed *= 1.1;
        break;
      case ("easy"):
        turns_needed *= 1.2;
        break;
    };

    var _str = `Straight pipes: **${straights}** [${straights*2}]\n90deg pipes: **${turns}** [${turns*2}]\nDifficulty: **${difficulty}**\n\nNeeded: **${Math.round(turns_needed)}**`;
    await interaction.editReply({ content: _str });
  }
};

module.exports = Command;