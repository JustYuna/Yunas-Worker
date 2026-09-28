const { EmbedBuilder } = require("discord.js");

const Presets = {
    rules: new EmbedBuilder()
            .setColor([150, 100, 250])
            .setTitle('📜 Server Rules')
            .setDescription(`

⚙️ ~ For server owners using Yeco ~

Yeco - Terms of Service:
https://github.com/JustYuna/Yeco/blob/main/ToS.md

🔗 ~ Other things to follow ~

Discord - Terms of Service:
https://discord.com/terms

ℹ️ ~ Other information ~

Having problems using Yeco?
→ Use /report to submit an issue
→ Or use /onboarding for a quick tutorial

Yeco - Privacy Policy:
https://github.com/JustYuna/Yeco/blob/main/PrivacyPolicy.md`)
};

module.exports = Presets;