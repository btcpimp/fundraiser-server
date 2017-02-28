'use strict'

const Sql = require('sequelize')

module.exports = function (db) {
  const User = db.define('user', {
    email: {
      type: Sql.STRING,
      primaryKey: true
    },
    name: Sql.STRING,
    password: Sql.BLOB
  })

  return { User }
}
