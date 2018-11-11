const axios      = require('axios')
const express    = require('express')
const bodyParser = require('body-parser')
const prettyMs   = require('pretty-ms')
const newman     = require('newman')
const app        = express()

app.use(bodyParser.urlencoded({extended: true}))

class TestRunContext {
    constructor(newmanResult) {
        this.start            = new Date(newmanResult.run.timings.started)
        this.end              = new Date(newmanResult.run.timings.completed)
        this.responseAverage  = newmanResult.run.timings.responseAverage
        this.totalRequests    = newmanResult.run.stats.tests.total
        this.testResultTotal  = newmanResult.run.stats.assertions.total
        this.testResultFailed = newmanResult.run.stats.assertions.failed
        this.failures         = newmanResult.run.failures
    }
    
    get failsList() {
        return this.failures.length > 0
            ? this.failures.reduce((accumulator, current) => `${accumulator} *${current.error.name}:* ${current.error.test} - _${current.error.message}_\n\n`, '')
            : "No Test Failures"
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
                    "mrkdwn": true,
                    "fields": [
                        {
                            "title": "Total Run Duration",
                            "value": `${this.runDuration}`,
                            "short": true
                        },
                        {
                            "title": "No. Of Requests",
                            "value": `${this.totalRequests}`,
                            "short": true
                        },
                        {
                            "title": "No. Of Assertions",
                            "value": `${this.testResultTotal}`,
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
                            "title": "Test Failures",
                            "value": `${this.failsList}`
                        }
                    ]
                }
            ]
        }
    }
}
let executeNewman = function () {
    return new Promise((resolve, reject) => {
        newman.run({
            collection: './collections/Restful_Booker_Collection.json',
            environment: './environments/Restful_Booker_Environment.json'
        }, (err, summary) => {
            if (err) {
                return reject(err)
            }
            resolve(summary)
        })
    })
}
app.post("/newmanRun", (req, res) => {   
    const responseURL = req.body.response_url
    
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
                            "value": "The Summary Report will be with you _very_ soon"
                        }
                    ]
                }
            ]
        }
    })
    .then(res.status(202).end())
    .then(executeNewman)
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
