const axios      = require('axios')
const express    = require('express')
const bodyParser = require('body-parser')
const prettyMs   = require('pretty-ms')
const newman     = require('newman')
const fs         = require('fs')
const path       = require('path')
const app        = express()

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.static('reports'));

const apikey = process.env.API_KEY

class TestRunContext {
    constructor(newmanResult) {
        this.collection       = newmanResult.collection.name;
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
    
    get environmentName() {
        return this.environment === undefined ? "No Environment specified for the Newman Run" : this.environment;
    }
    
    get collectionName() {
        return this.collection === undefined ? "No Collection for the Newman Run" : this.collection;
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
                    "title_link": "http://newman-app.serverless.social/htmlResults.html",
                    "text": `Collection : *${this.collectionName}* \nEnvironment : *${this.environmentName}*\nTotal Run Duration: *${this.runDuration}*`,
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

let getCollectionUid = collectionName => {
    const errorMessage = 'The Collection name provided is not found in your workspace. Please try again';
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: `https://api.getpostman.com/collections/?apikey=${apikey}`
        })
        .then(response => {
            collection = response.data.collections.find(collection => collection.name === collectionName);
            collection != undefined ? resolve(collection.uid) : reject(errorMessage);
        })
        .catch(error => {
            reject(error);
        });
    });
};

let getEnvironmentUid = environmentName => {
    const errorMessage = 'The Environment name provided is not found in your workspace. Please try again';
    return new Promise((resolve, reject) => {
        axios({
            method: "get",
            url:
            `https://api.getpostman.com/environments/?apikey=${apikey}`
        })
        .then(response => {
            environment = response.data.environments.find( environment => environment.name === environmentName);
            environment != undefined ? resolve(environment.uid) : reject(errorMessage);
        })
        .catch(error => {
            reject(error);
        });
    });
};

let executeNewman = (collectionUid, environmentUid, iterationCount) => {
    return new Promise((resolve, reject) => {
        newman.run({
            collection: `https://api.getpostman.com/collections/${collectionUid}?apikey=${apikey}`,
            environment: `https://api.getpostman.com/environments/${environmentUid}?apikey=${apikey}`,
            iterationCount: iterationCount,
            reporters: ['cli', 'htmlextra'],
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

function InvalidArgument(responseURL, argName, message, res) {
    axios({
        method: 'post',
        url: `${responseURL}`,
        headers: { 'Content-Type': 'application/json' },
        data: {
            'response_type': 'in_channel',
            'attachments': [
                {
                    'color': 'danger',
                    'title': `Invalid ${argName}`,
                    'mrkdwn': true,
                    'fields': [
                        {
                            'value': `${message}`
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

    const collectionName = channelText.split(" & ")[0];
    const environmentName = channelText.split(" & ")[1];
    const iterationCount = parseInt(channelText.split(" & ")[2]);
        
    if (channelText.length === 0) {
        message = "Please enter a valid *Command* .";
        return InvalidArgument(responseURL,'Slack command', message, res);
    } else if (collectionName === undefined || environmentName === undefined) {
        message = `Could not find the Collection or the Environment in your command. Please try again.`;
        return InvalidArgument(responseURL, 'Slack command', message, res);
    }

    getCollectionUid(collectionName)
    .then(collectionUid => {
        getEnvironmentUid(environmentName)
        .then(environmentUid => {
            axios({
                'method': "post",
                'url': `${responseURL}`,
                'headers': { "Content-Type": "application/json" },
                'data': {
                    'response_type': "in_channel",
                    'attachments': [
                        {
                            'color': "good",
                            'title': "Newman Test Run Started",
                            'mrkdwn': true,
                            'fields': [
                                {
                                    'value': `Your Summary Report for the collection *${collectionName}* in *${environmentName}* environment will be with you _very_ soon`
                                }
                            ]
                        }
                    ]
                }
            })
            .then(res.status(202).end())
            .then(() => {
                    executeNewman(collectionUid, environmentUid, iterationCount)
                    .then(newmanResult => {
                        return new TestRunContext(newmanResult);
                    })
                    .then(context => {
                        return axios({
                            'method': "post",
                            'url': `${responseURL}`,
                            'headers': { "Content-Type": "application/json" },
                            'data': context.slackData
                        });
                    })
                    .catch(err => {
                        axios({
                            method: "post",
                            url: `${responseURL}`,
                            headers: { "Content-Type": "application/json" },
                            data: {
                                response_type: "in_channel",
                                attachments: [
                                    {
                                        color: "danger",
                                        title: "Newman Run Error",
                                        fields: [
                                            {
                                                value: `${err}`
                                            }
                                        ]
                                    }
                                ]
                            }
                        });
                    });
            });
         })
        .catch(error => {
            InvalidArgument(responseURL, "Environment", error, res);
        });
    })
    .catch(error => {
        InvalidArgument(responseURL, "Collection", error, res);
    });
})
const port = Number(process.env.PORT || 3000)
app.listen(port)
console.log(`Server Started on port: ${port}`)
