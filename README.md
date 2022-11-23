# gh-wiki-monitor
A Google Apps Script that sends notifications whenever someone edits a GitHub wiki. Can send notifications via email or Discord webhook. Requires the [cheeriogs](https://github.com/tani/cheeriogs) script library.

## Setup
1. Create a new Google Apps Script project
2. Follow the instructions on the [cheeriogs](https://github.com/tani/cheeriogs) page to add Cheerio to your project
3. Copy the code from my [Code.gs](Code.gs) file into your project
4. Hit Ctrl-S to save the project
5. Click the Project Settings tab on the left, scroll down and click "Add script property"
6. Create a property called `GITHUB_REPO`. Its value should be the full name of the repository you want to monitor, such as `n0samu/gh-wiki-monitor`.
7. If you want to receive email notifications, create a script property called `EMAIL_ADDRESS` and set it to your email address.
8. If you want to receive notifications in a Discord channel, first follow the instructions in the "Making a Webhook" section of [this article](https://support.discord.com/hc/articles/228383668-Intro-to-Webhooks). (Ignore the "GitHub Webhook Integration section - that only allows you to receive notifications for issues, PRs, etc - not wiki edits.) Copy the webhook URL, then create a script property called `DISCORD_WEBHOOK` and paste in the webhook URL.
9. Save your script properties, then click the Triggers tab on the left. 
10. Click "Add a Trigger", then under "Choose which function to run" select "main".
11. Use the "Time-driven" event source and choose how often you want the script to check for edits. I suggest setting the script to run every 10 minutes.

That's it! Now you can get notified whenever someone edits your wiki, instead of discovering some rando deleted your documentation a week after the fact! :sweat_smile:
