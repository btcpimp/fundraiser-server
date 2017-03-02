#!/usr/bin/env node

'use strict'

const express = require('express')
const Sql = require('sequelize')
const helmet = require('helmet')
const cors = require('cors')
const session = require('express-session')
const SessionStore = require('connect-session-sequelize')(session.Store)
const bodyParser = require('body-parser')
const debug = require('debug')
const log = {
  sql: debug('sql'),
  info: debug('cosmos:info')
}
const config = require('./config.json')

async function main () {
  const DEV = process.env.NODE_ENV === 'development'

  // set up Postgres
  const db = new Sql(config.db, { logging: log.sql })
  const models = require('./src/models.js')(db)

  // set up REST routes
  const app = express()
  app.use(helmet())
  app.use(cors({
    origin: DEV ? 'http://localhost:8600' : config.allowOrigin,
    credentials: true
  }))
  app.use(session({
    secret: config.cookieSecret,
    store: new SessionStore({ db }),
    cookie: { secure: !DEV },
    name: 'session'
  }))
  app.use(bodyParser.json())
  require('./src/routes.js')(app, models)

  // connect to Postgres and sync tables
  await db.sync()
  log.info('DB initialized')

  // start HTTP server
  // TODO: https
  const port = process.env.PORT || config.port || 8000
  app.listen(port)
  log.info(`Server listening on port ${port}`)
}

main().catch((err) => console.error(err.stack))
