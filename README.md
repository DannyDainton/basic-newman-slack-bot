# Basic Newman Slack Bot

This is a basic `express` app with a single `POST` route, which will allow you to run Postman collections, either exported JSON files or from a shared Collection link via [newman](https://github.com/postmanlabs/newman).

Everything that you will need to run the application is contained within this repo but in order for it to be accessible by Slack, it will need be to be hosted _somewhere_. 

Where this location/platform is, will depend on your own context, you may have sensitive data in the files and you _might_ need to have a higher level over control so choose a place that suits your needs.

Just as a means to *show* you it working and demonstrate something you _could_ do yourself, I'm going to be using [Heroku](https://www.heroku.com). This is a platform-as-a-service provider, that will allow me to deploy the application code onto a machine running `nodejs`, install all the dependency modules from the `package.json` file and give me a public facing URL as an entry point into the `express` app.

Heroku offers a free account which allows you to easily get up and running in seconds, as it's a free version, the app goes to 'sleep' after a longer period of inactivity but you 'wake it up' when it receives another `POST` request. Head over to [Heroku](https://signup.heroku.com/), sign up and Log yourself in.

Once you're logged in, you can use the one click 'Deploy to Heroku' button - This will open the Heroku deploy page in the same window so I would recommend opening it in a new tab. I tried using HTML within the markdown to open it in a new window but apparently Github doesn't like this method. :( 

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/DannyDainton/basic-newman-slack-bot)

Heroku takes all the information contained in the `app.json` file and this tells it _what_ to deploy.

![Heroku Deploy](./public/Heroku_Deploy.PNG)

Give your application a unique name (I've called mine _dd-test-app_), this will form part of the URL, it will create something like this _https://dd-test-app.herokuapp.com_.

Once you have a valid name, select a region and hit the "Deploy App" button.

This will then build the application and deploy it on the Heroku platform, the whole process takes ~30 secs so it's super quick. :)

### How can we start using this in Slack

For this demonstration on the usage of the `express` app, I have created my own personal Slack so I'm in full control of everything, this might not be the case for you, have quick a chat with whoever is the Admin and work with them to install the app into a Workspace.

It feels a bit wrong for me to just basically repeat Slack's documentation on how to add a Custom Slash Command to a Workspace - The effort and attention that these user guides have been given is amazing, it's really easy to follow and you get up and running in next to no time.

I'm going to explain how to do it using the method I went through but for the full details, I would absolutely jump over to Slack and check out the [offical guide](https://api.slack.com/slash-commands). 

- Go to the [Create a slash command](https://api.slack.com/slash-commands) page
- Scroll down to the "Creating a Slash Command" section and press the "Create your slack app" button
- In the dialog box, give your App a name (I called mine 'Newman Test Runner') and select the Workspace that the app will belong too
- Press the "Create app" button
- Select the "Slash Command" option and then press the "Create New Command" button
- Choose a command "_/something_" and add your Heroku app URL and `POST` route path - For example: "https://dd-test-app.herokuapp.com/newmanRun"
- Give it a short description and press "Save"

We have now created our Custom Slash Command but before we can use it in the Workspace, we need to authorize it first. 

We can do this by selecting "OAuth & Permissions" from the menu options and then pressing the "Install App to Workspace" button. Finally, we hit the "Authorize" button and we're all set. 

The Custom Slash Command is now created and Authorized to be used within the specified Workspace.

---

### Using the app in a slack channel

Once the Custom Slash Command has been created and authorized against your Workspace, you can now run the command and see the results returned. In the example below, I'm using the `/testrun` command, which I added during the Slack installation, to start the run - As you've added the app to the Workspace, it will show in the auto-complete/actions list.

In the `./collections` and `./environments` folders, I've added a sample set of files that will be used to test out the integration. Let's run the command using these files and take a look at the results.

There are a couple of different responses that you will receive back into Slack once the Newman Run has completed. I'm just using a few of the details contained in the `newman summary object` that gets created after the newman test run and then displaying these in the Slack message.

If all the tests `Pass`, your message will look something like this: 

![Test Run Pass](./public/Test_Run_Pass.png)

If there are any test failures from the Newman Run, these will be listed in the message under the `Test Failures` section:

![Test Run Fail](./public/Test_Run_Fail.png)

If the Newman Run failed before running the Collection or there was a syntax error within a test etc. This will return a `Newman Error` message with a description of the error: 

![Test Run Error](./public/Test_Run_Error.png)

---

### Where do I go from here

This is just an example using a set of files that mean nothing in your context. If you have a set of files containing non-sensitive information, you could add these to the `./collections` and `./environments` folders and then modify the `app.js` on lines 92 and 93 to point at your files. This will require a re-deploy, if you've deployed the `express` app already.

If you wanted to deploy the `express` app for use with an AWS Lambda, I would take a look at using [claudiajs](https://claudiajs.com/tutorials/serverless-express.html), it makes this process so simple and you would have it up and running in a similar time as it takes with Heroku.

---

Hope this is useful to anyone wanting to give it a go, I'm a novice JS coder and I totally know my limitations. My first iteration of the app "worked" and returned what I wanted it too everytime but the code was quite dodgy - I was shown a cleaner way of doing it by one of the awesome developers on our team, [Matt Davey](https://github.com/Matthew-Davey). He put me on the right path and this final version is very much his work too.

Enjoy....If you have any questions you can reach me on Twitter `@dannydainton`.
