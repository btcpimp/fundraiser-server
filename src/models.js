'use strict'

const { INTEGER, STRING, BLOB, BIGINT } = require('sequelize')

module.exports = function (db) {
  const User = db.define('user', {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: STRING,
    passwordHash: BLOB,
    name: STRING
  })

  const Transaction = db.define('transaction', {
    type: STRING,
    paid: BIGINT,
    received: BIGINT,
    address: STRING
  })

  const Wallet = db.define('wallet', {
    encryptedSeed: BLOB,
    salt: BLOB,
    iv: BLOB
  })

  User.hasMany(Transaction)
  User.hasMany(Wallet)

  return { User, Transaction, Wallet }
}
