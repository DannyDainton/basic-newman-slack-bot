# Basic Newman Slack Bot

This is a basic [express](https://expressjs.com/) app with a single `POST` route, which will allow you to run Postman collections and environment files with [newman](https://github.com/postmanlabs/newman), straight from a Slack channel.

<!-- TOC -->

- [Installing the modules and running the express app on a local machine](#installing-the-modules-and-running-the-express-app-on-a-local-machine)
- [Locally running the express app with Docker](#locally-running-the-express-app-with-docker)
- [Installing the Newman Runner app in Slack](#installing-the-newman-runner-app-in-slack)
- [Using the Newman Runner app in a Slack channel](#using-the-newman-runner-app-in-a-slack-channel)
- [Deploying the express app to Heroku](#deploying-the-express-app-to-heroku)
- [What else can I do with the express app](#what-else-can-i-do-with-the-express-app)
    - [Change the environment file names](#change-the-environment-file-names)
    - [Add additional Newman options](#add-additional-newman-options)
    - [Custom HTML Reports](#custom-html-reports)

<!-- /TOC -->

## Installing the modules and running the express app on a local machine

To use a Custom Slash Command in Slack, the express app needs to be running and the endpoints are publicly accessible - How do we get around this for testing on a local machine?

I've managed to workaround this and use my local machine as the host, by using the [localtunnel](https://localtunnel.github.io/www/) npm module.

Clone this `basic-newman-slack-bot` repo and install all the npm modules using the `npm install` command in a terminal.

The `basic-newman-slack-bot` has been pre-loaded with a few example files, these files can be found in the `./collections` and `./environments` folders:

```sh
- collections
    - Restful_Booker_Collection.json
- environments
    - Local_Restful_Booker_Environment.json
    - Staging_Restful_Booker_Environment.json
    - Production_Restful_Booker_Environment.json
```

These files will _tell_ `newman` where to make the requests too. We'll be using the [Restful-Booker API](https://restful-booker.herokuapp.com/), this is a publicly available set of endpoints, that I had no control over so it might be worth doing a quick check first, just to know that the API is alive....or you might see a lot of test failures.

In the same terminal, navigate to the cloned directory and start the `express` server using the `npm start` command. This will start the app on port `3000`.

In a separate terminal, within the same directory, use the `npm run start-tunnel` command, this will return a publicly available URL that can be used in Slack. You should now see something that looks like the image below:

![Local Tunnel Link](./public/Local_Tunnel_Link.png)

## Locally running the express app with Docker

Running the app locally using Docker can achieved using the `docker-compose up` command from the terminal. This will create the images and start the containers, once started, you can use the same localtunnel created URL _https://newman-app.localtunnel.me_ within Slack.

![Running Locally With Docker](./public/Running_Locally_With_Docker.png)

**Note** - If you make changes to any of the files or add things like your own `collection` or `environment` files, you will need to run the `docker-compose build` command, for the changes to take effect.

---

## Installing the Newman Runner app in Slack

For this demonstration, I have my own personal `dannysslack` Workspace, that I created so I'm in full control of everything, this might not be the case for you. If your Slack Workspace is locked down by any sort of Admin, work with them to install the Custom Slash Command into the Workspace.

It feels a bit wrong for me to just repeat Slack's documentation on how to add a Custom Slash Command to a Workspace - The effort and attention that these user guides have been given is amazing, it's really easy to follow and you get up and running in next to no time.

I'm going to explain how to do it using the method I went through but for the full details, I would absolutely jump over to Slack and check out the [official guide](https://api.slack.com/slash-commands).

- Go to the [Create a slash command](https://api.slack.com/slash-commands) page
- Scroll down to the "Creating a Slash Command" section and press the "Create your slack app" button
- In the dialog box, give your App a name (I called mine 'Newman Test Runner') and select the Workspace that the app will belong too
- Press the "Create app" button
- Select the "Slash Command" option and then press the "Create New Command" button
- Choose a command "_/something_" and add the app URL and `POST` route path - For example: "https://newman-app.localtunnel.me/newmanRun" if you're running it locally.
- Give it a short description and press "Save"

We have now created our Custom Slash Command but before we can use it in the Workspace, we need to authorize it first. 

We can do this by selecting "OAuth & Permissions" from the menu options and then pressing the "Install App to Workspace" button. Finally, we hit the "Authorize" button and we're all set.

The Custom Slash Command is now created and Authorized to be used within the specified Workspace.

---

## Using the Newman Runner app in a Slack channel

You can now run the command and see the results returned within any created channel in the Workspace. In the example below, I'm using the `/testrun` command, which I added during the Slack installation, to start the run - As you've added the app to the Workspace, it will show in the auto-complete/actions list.

The files in the `./environments` folder have been pre-fixed with `Local`, `Staging` and `Production` this is to show that you can _tell_ the app to run the Postman collection on a specific environment.

![Slack Bot Command](./public/Slack_Bot_Command.PNG)

![Slack Bot Run](./public/Slack_Bot_Run.gif)

The example environment files in this repo contain the same data, they will send the same requests to the same endpoints and you will get back the same responses for each one. You _could_ replace these files with your own configured environments and run your requests against different endpoints. The name of the `Environment File`, listed in the _Summary Test Result_ message is taken from the `name` property inside the `.JSON` file.

![Different Environments](./public/Slack_Bot_Environments.PNG)

There is an optional `IterationCount` parameter that can be added, This value is set to `1` by default but can be changed by specifying a `number` in the run command.

![Iteration Count](./public/Slack_Bot_Iteration_Count.PNG)

![Iteration Count Run Command](./public/Slack_Bot_Run_Iterations.gif)

There are a couple of different responses that you will receive back into Slack once the Newman Run has completed. I'm just using a few of the details contained in the `newman summary object` that gets created after the newman test run and then displaying these in the Slack message.

If all the tests `Pass`, your message will look something like this:

![Test Run Pass](./public/Slack_Bot_Pass.PNG)

If you have specified an `iteractionCount`, it will look something like this:

![Iteration Count Run](./public/Slack_Bot_Iteration_Count_Run.PNG)

If any of the tests have been `skipped` from the Newman Run, these will be listed in the message under the `Skipped Tests` section. This will also adjust the `No. Of Assertions` to reflect the correct total of Tests run:

![Skipped Tests](./public/Slack_Bot_Skipped_Tests.PNG)

If there are any test failures from the Newman Run, these will be listed in the message under the `Test Failures` section:

![Test Run Failures](./public/Slack_Bot_Failures.PNG)

If the Newman Run failed before running the Collection or there was a syntax error within a test etc. This will return a `Newman Error` message with a description of the error:

![Newman Run Error](./public/Slack_Bot_Newman_Fail.PNG)

---

## Deploying the express app to Heroku

Just as a means to *show* you it working outside of the local environment and demonstrate something you _could_ deploy yourself, I'm going to be using [Heroku](https://www.heroku.com). This is a platform-as-a-service provider, that will allow you to deploy the application code onto a machine running `nodejs`, install all the dependencies from the `package.json` file and give you a public facing URL as an entry point into the `express` app.

Heroku offers a free account which allows you to easily get up and running in seconds, as it's a free version, the app goes to 'sleep' after a longer period of inactivity but you 'wake it up' when it receives another `POST` request. Head over to [Heroku](https://signup.heroku.com/), sign up and Log yourself in.

Once you're logged in, you can use the one click 'Deploy to Heroku' button - This will open the Heroku deploy page in the same window so I would recommend opening it in a new tab. I tried using HTML within the markdown to open it in a new window but apparently GitHub doesn't like this method. :(

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/DannyDainton/basic-newman-slack-bot)

Heroku takes all the information contained in the `app.json` file and this tells it _what_ to deploy.

![Heroku Deploy](./public/Heroku_Deploy.PNG)

Give your application a unique name (I've called mine _dd-test-app_), this will form part of the URL, it will create something like this _https://dd-test-app.herokuapp.com_.

Once you have a valid name, select a region and hit the "Deploy App" button.

This will then build the application and deploy it on the Heroku platform, the whole process takes ~30 seconds so it's super quick. :)

You will now be able to use the _https://dd-test-app.herokuapp.com/newmanRun_ URL, or whatever you called your app, within Slack by following the Custom Slash Command instructions.

---

## What else can I do with the express app

**Note** - If you make changes to any of the files or add things like your own `collection` or `environment` files, you will need to run the `docker-compose build` command, for the changes to take effect.

### Change the environment file names

Currently, there is mechanism in place that will check that the `environment` value entered in the Slack command, matches a filename in the `./environments` folder. If it doesn't find that filename in the `./environments` folder, you will see this message returned:

![Invalid File Name](./public/Invalid_File_Name.PNG)

You could modify this filename check and the `newman.run` object to point to your own files, in the `./collections` and `./environments` folders.

In the example below, if your environment file was named `Local_Environment.json` - Using the `/testrun Local` command within Slack, would check that the filename exists in the `./environments` folder and then run the requests using those values in the file. You would need to change the `filename` variable in the `app.js` file to match your own naming convention.

```javascript
    const filename = `./environments/${enteredEnv}_Environment.json`
```


```javascript
        newman.run({
            collection: './collections/My_New_Collection.json',
            environment: environmentFile,
            iterationCount: iterationCount,
            reporters: ['cli', 'htmlextra'],
            reporter: {
                htmlextra: {
                    export: './reports/htmlResults.html',
                    template: './reports/templates/template.hbs'
                }
            }
        }
```

### Add additional Newman options

The `newman.run` object has lots of different [options](https://github.com/postmanlabs/newman#newmanrunoptions-object--callback-function--run-eventemitter) available that will change the way the test run is configured. If you wanted to add an `iterationData` file, that holds specific values needed for the run, it can be done in the following way. The relative path to the file would need to be correct.

```javascript
        newman.run({
            collection: './collections/Restful_Booker_Collection.json',
            environment: './environments/Local_Restful_Booker_Environment.json',
            iterationCount: iterationCount,
            iterationData: './mynewfolder/mydatafile.csv',
            reporters: ['htmlextra'],
            reporter: {
                htmlextra: {
                    export: './reports/htmlResults.html'
                }
            }
        }
```

### Custom HTML Reports

I've added the [newman-reporter-htmlextra](https://github.com/DannyDainton/newman-reporter-htmlextra) module to the app, this creates a custom HTML report that will show the full summary of the newman test run.  

The Slack message output looks the _same_ but the `title` is now a hyperlink that points to _https://newman-app.localtunnel.me/htmlResults.html_ - By clicking this link, it will open up the report in a new browser tab.

![Dashboard Report](./public/Dashboard_Template.PNG)

The report is created using an optional custom template file, this can be found in the `./reports/templates` folder. The `newman-reporter-htmlextra` reporter will just create a default styled report if you don't add the `template` property.

To use a different template, you will need to change the path of the `template` option:

```javascript
            reporters: ['htmlextra'],
            reporter: {
                htmlextra: {
                    export: './reports/htmlResults.html',
                    template: '<path to template>'
                }
            }
```
This has the run information in different tabbed sections, selecting each of these will display the details of the newman run. 

For example, this is the `Requests` and `Failed Tests` tabs:

![Requests View](./public/Request_View.PNG)

![Failed View](./public/Failed_View.PNG)


If you choose to use the [_Deploying the express app to Heroku_](#deploying-the-express-app-to-heroku) method to host your express app, you will need to change the `title-link` property in the `app.js` file, to point to your heroku app URL, in order to see the generated report. Currently, this is hardcoded to the local URL.

For example:

```javascript
    "title_link": "https://your-heroku-app.herokuapp.com/htmlResults.html"
```

The HTML report functionality is still very limited, I will be improving this to give you the ability to store the reports. I use a method to store the reports to an AWS S3 bucket but this isn't really a generic solution to add to the express app.

---

Hope this is useful to anyone wanting to give it a go, I'm a novice JS coder and I totally know my limitations. My first iteration of the app "worked" and returned what I wanted it too every time but the code was quite dodgy - I was shown a cleaner way of doing it by one of the awesome developers on our team, [Matt Davey](https://github.com/Matthew-Davey). He put me on the right path and this final version is very much his work too.

Enjoy....If you have any questions about the app or any feedback, you can reach me on Twitter `@dannydainton`.
