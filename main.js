#!/usr/bin/env node

'use strict'

const express = require('express')
const Sql = require('sequelize')
const debug = require('debug')
const log = {
  sql: debug('sql'),
  info: debug('cosmos:info')
}
const config = require('./config.json')

// set up Postgres
const db = new Sql(config.db, { logging: log.sql })
const models = require('./src/models.js')(db)

// set up REST routes
const app = express()
require('./src/routes.js')(app, models)

async function main () {
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
