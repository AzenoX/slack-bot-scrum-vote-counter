const { App } = require("@slack/bolt");
require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
});

(async () => {
    const port = 3000
    // Start your app
    await app.start(process.env.PORT || port);
    console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();


app.command("/testcmd", async ({ command, ack, say }) => {
    try {
        await ack();
        say("Yaaay! that command works!");
    } catch (error) {
        console.log("err")
        console.error(error);
    }
});