'use strict'

const { INTEGER, STRING, BLOB, BIGINT } = require('sequelize')

const unique = (type) => ({ type, unique: true })

module.exports = function (db) {
  const User = db.define('user', {
    id: {
      type: INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    email: {
      type: STRING,
      unique: true
    },
    passwordHash: BLOB,
    passwordSalt: BLOB,
    name: STRING
  })

  const Transaction = db.define('transaction', {
    type: STRING,
    paid: BIGINT,
    received: BIGINT,
    address: STRING,
    txid: unique(BLOB)
  })

  const Wallet = db.define('wallet', {
    encryptedSeed: unique(BLOB),
    salt: BLOB,
    iv: BLOB
  })

  User.hasMany(Transaction)
  User.hasMany(Wallet)

  return { User, Transaction, Wallet }
}
