const axios      = require('axios')
const express    = require('express')
const bodyParser = require('body-parser')
const prettyMs   = require('pretty-ms')
const newman     = require('newman')
const fs         = require('fs')
const path       = require('path')
const app        = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('reports'));

class TestRunContext {
    constructor(newmanResult) {
        this.environment      = newmanResult.environment.name
        this.iterationCount   = newmanResult.run.stats.iterations.total
        this.start            = new Date(newmanResult.run.timings.started)
        this.end              = new Date(newmanResult.run.timings.completed)
        this.responseAverage  = newmanResult.run.timings.responseAverage
        this.totalRequests    = newmanResult.run.stats.tests.total
        this.testResultTotal  = newmanResult.run.stats.assertions.total
        this.testResultFailed = newmanResult.run.stats.assertions.failed
        this.failures         = newmanResult.run.failures
        this.skipped          = newmanResult.skippedTests
    }
    
    get percentagePassed() {
        return (this.testResultTotal * 100 / (this.testResultTotal + this.testResultFailed)).toFixed(2)
    }

    get envFileName() {
        return this.environment === undefined ? "No Environment file specified for the Newman Run" : this.environment
    }
    
    get skippedList() {
        if(this.skipped === undefined) {
            return "No Skipped Tests"
        }
        else {
            return this.skipped.reduce((accumulator, current) => `${accumulator} *${current.item.name}:* _${current.assertion}_\n\n`, '')
        }
    }

    get failsList() {
        return this.failures.length > 0
            ? this.failures.reduce((accumulator, current) => `${accumulator} *${current.error.name}:* ${current.source.name} - ${current.error.test} - _${current.error.message}_\n\n`, '')
            : "No Test Failures"
    }

    get totalAssertions() {
        if(this.skipped === undefined) {
            return this.testResultTotal
        }
        else {
            return  this.testResultTotal - this.skipped.length
        }
        
    }

    get result() {
        return this.testResultFailed > 0 ? "Failed" : "Passed"
    }

    get runDuration() {
        return prettyMs(this.end - this.start)
    }

    get colour() {
        return this.testResultFailed > 0 ? "danger" : "good"
    }

    get averageResponseTime() {
        return prettyMs(this.responseAverage, {msDecimalDigits: 2})
    }

    get slackData() {
        return {
            "response_type": "in_channel",
            "attachments": [
                {
                    "fallback": "Newman Run Summary",
                    "color": `${this.colour}`,
                    "title": "Summary Test Result",
                    "title_link": "https://newman-app.localtunnel.me/htmlResults.html",
                    "text": `Environment File: *${this.envFileName}*\nTotal Run Duration: *${this.runDuration}*`,
                    "mrkdwn": true,
                    "fields": [
                        {
                            "title": "No. Of Iterations ",
                            "value": `${this.iterationCount}`,
                            "short": true
                        },
                        {
                            "title": "No. Of Requests",
                            "value": `${this.totalRequests}`,
                            "short": true
                        },
                        {
                            "title": "No. Of Assertions",
                            "value": `${this.totalAssertions}`,
                            "short": true
                            
                        },
                        {
                            "title": "No. Of Failures",
                            "value": `${this.testResultFailed}`,
                            "short": true
                        },
                        {
                            "title": "Av. Response Time",
                            "value": `${this.averageResponseTime}`,
                            "short": true
                        },
                        {
                            "title": "Result",
                            "value": `${this.result}`,
                            "short": true
                        },
                        {
                            "title": "Skipped Tests",
                            "value": `${this.skippedList}`
                        },
                        {
                            "title": "Test Failures",
                            "value": `${this.failsList}`
                        }
                    ]
                }
            ]
        }
    }
}

let executeNewman = (environmentFile, iterationCount) => {
    return new Promise((resolve, reject) => {
        newman.run({
            collection: './collections/Restful_Booker_Collection.json',
            environment: environmentFile,
            iterationCount: iterationCount,
            reporters: ['htmlextra'],
            reporter: {
                htmlextra: {
                    export: './reports/htmlResults.html'
                }
            }
        }, (err, summary) => {
            if (err) {
                return reject(err)
            }
            resolve(summary)
        })
    })
}

function InvalidName(responseURL, message, res) {
    axios({
        method: 'post',
        url: `${responseURL}`,
        headers: { "Content-Type": "application/json" },
        data: {
            "response_type": "in_channel",
            "attachments": [
                {
                    "color": "danger",
                    "title": "Invalid Environment",
                    "mrkdwn": true,
                    "fields": [
                        {
                            "value": `${message}`
                        }
                    ]
                }
            ]
        }
    })
    .then(res.status(202).end());
    return;
}

app.post("/newmanRun", (req, res) => {   
    
    const responseURL = req.body.response_url
    const channelText = req.body.text

    const enteredEnv     = (channelText).split(" ")[0]
    const iterationCount = parseInt((channelText).split(" ")[1])
    
    const filename = `./environments/${enteredEnv}_Restful_Booker_Environment.json`
    
    const fileNameCheck = fs.existsSync(filename)

    if (channelText.length === 0) {
        
        message = "Please enter an valid *Environment* name."
        
        return InvalidName(responseURL, message, res)

    } else if (fileNameCheck === false) {
        
        message = `Could not find the *${path.basename(filename)}* environment file. Please try again.` 
        
        return InvalidName(responseURL, message, res)

    } else {
        environmentFile = filename
    }

    axios({
        method: 'post',
        url: `${responseURL}`,
        headers: { "Content-Type": "application/json" },
        data: { 
            "response_type": "in_channel",
            "attachments": [
                {
                    "color": "good",
                    "title": "Newman Test Run Started",
                    "mrkdwn": true,
                    "fields": [
                        {
                            "value": `Your Summary Report for the *${enteredEnv}* environment will be with you _very_ soon`
                        }
                    ]
                }
            ]
        }
    })
    .then(res.status(202).end())
    .then(() => executeNewman(environmentFile, iterationCount))
    .then(newmanResult => { return new TestRunContext(newmanResult) })
    .then(context => {
        return axios({
            method: 'post',
            url: `${responseURL}`,
            headers: { "Content-Type": "application/json" },
            data: context.slackData
        })
    })
    .catch(err => {
        axios({
            method: 'post',
            url: `${responseURL}`,
            headers: { "Content-Type": "application/json" },
            data: { 
                "response_type": "in_channel",
                "attachments": [
                    {
                        "color": "danger",
                        "title": "Newman Run Error",
                        "fields": [
                            {
                                "value": `${err}`
                            }
                        ]
                    }
                ]
            }
        })
    })
})
const port = Number(process.env.PORT || 3000)
app.listen(port)
console.log(`Server Started on port: ${port}`)
