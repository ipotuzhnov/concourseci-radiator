'use strict'
const express = require('express')
const logger  = require('morgan')
const request = require('request-promise')
const Promise = require('bluebird')
const LRU     = require('lru-cache')
const config  = require('./config')

// app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))

// get properties from config file
const baseUrl    = config.hostname || 'http://concourse.change.me.hostname'
const ciUsername = config.username || 'admin'
const ciPassword = config.password || 'admin'
const ciTeam     = config.team     || 'main'

// cached token for an hour
const tokens = LRU({ maxAge: 60 * 60 * 1000 })


const app = express()

app.use(express.static('public'))

app.use(logger('common'))

app.get('/api/v1/pipelines', proxy(fetchPipelines))

app.get('/api/v1/pipelines/:pipeline/jobs/:job/badge', proxy(fetchBadge))

app.use((err, req, res, next) => {
    return res.status(500).send(err && err.message)
})

app.listen(process.env.PORT || 3001)

/**
 * Proxy request to concource CI
 */
function proxy (req, res, next) {
    return fn => {
        return Promise.resolve()
            // Get fresh auth header
            .then(getAuthenticationToken)
            // Get list of all the pipelines
            .then(t => fn(t, req.params))
            .then(res.send.bind(res))
            .catch(next)
    }
}

/**
 * Method that returns the cached header for an authentication
 * and updates the bearer token periodically, because token
 * can be expired.
 */
function getAuthenticationToken () {
    // get the Bearer Token for the given team avoiding to request it again and again
    if (tokens.get(ciTeam)) {
        return tokens.get(ciTeam)
    }

    return Promise
        .try(request.bind(request, {
            url: baseUrl + '/api/v1/teams/' + ciTeam + '/auth/token',
            auth: {
                user: ciUsername,
                pass: ciPassword,
            },
            json: true,
        }))
        .then(body => {
            if (!body.value) {
                throw new Error('Bearer nonsence')
            }

            return body.value
        })
        // remember the new
        .then(token => {
            tokens.set(ciTeam, token)
            return token
        })
}

/**
 * Make requests to the concourse CI and collect easy-to-parse output
 * about pipelines and job statuses
 */
function fetchPipelines (token) {
    // iterate over pipelines and find the status for each
    return Promise
        .try(request.bind(request, {
            url: baseUrl + '/api/v1/pipelines',
            headers: {
                Authorization: `Bearer ${token}`
            },
            json: true,
        }))
        .map(checkPipelineStatus.bind(null, token))

    // sort pipelines by name
    // lstPipelines = sorted(lstPipelines, key=lambda pipeline: pipeline['name'])
}

function checkPipelineStatus (token, pipeline) {
    const details = {}
    details['url'] = baseUrl + pipeline['url']
    details['name'] = pipeline['name']
    details['paused'] = pipeline['paused']

    if (pipeline.paused) return details

    return Promise
        .try(fetchJobs.bind(null, token, pipeline))
        .then(jobs => details.jobs = jobs)
        .then(() => details)
}

function fetchJobs (token, pipeline) {
    return Promise
        .try(request.bind(request, {
            url: baseUrl + '/api/v1/teams/' + ciTeam + '/pipelines/' + pipeline['name'] + '/jobs',
            headers: {
                Authorization: `Bearer ${token}`
            },
            json: true,
        }))
        .map(job => {
            if (job.next_build) {
                return {
                    status: job['next_build']['status'],
                    id: job['next_build']['id']
                }
            }

            if (job.finished_build) {
                return {
                    status: job['finished_build']['status'],
                    id: job['finished_build']['id']
                }
            }

            return {
                status: 'non-exist'
            }
        })
}

/**
 * Make requests to the concourse CI to fetch a badge
 */
function fetchBadge (token, params) {
    if (!params) throw new Error('params is empty')

    if (!params.pipeline) throw new Error('pipeline is not specified')

    if (!params.job) throw new Error('job is not specified')

    return Promise
        .try(request.bind(request, {
            url: baseUrl + `/api/v1/pipelines/${params.pipeline}/jobs/${params.job}/badge`,
            headers: {
                Authorization: `Bearer ${token}`
            },
        }))
}
