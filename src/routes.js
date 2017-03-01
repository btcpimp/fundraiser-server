'use strict'

const promisify = require('bluebird').promisify
let { pbkdf2, randomBytes } = require('crypto')
pbkdf2 = promisify(pbkdf2)
randomBytes = promisify(randomBytes)
let { ATOMS_PER_BTC } = require('cosmos-fundraiser').bitcoin

async function hashPassword (password, salt) {
  return await pbkdf2(
    Buffer(password), salt, 20000, 20, 'sha512')
}

module.exports = function (app, models) {
  let { User, Transaction, Wallet } = models

  async function requireLogin (req, res, next) {
    let userId = req.session.userId
    if (userId == null) {
      let error = 'Must be logged in'
      return res.status(401).json({ error })
    }
    req.user = await User.findById(userId)
    next()
  }

  function requireLogout (req, res, next) {
    if (req.session.userId != null) {
      let error = 'Already logged in'
      return res.status(401).json({ error })
    }
    next()
  }

  app.post('/register', requireLogout, async (req, res) => {
    let { email, name, password } = req.body
    // TODO: validate fields
    let passwordSalt = await randomBytes(20)
    let passwordHash = await hashPassword(password, passwordSalt)
    let { id } = await User.create({ email, name, passwordSalt, passwordHash })
    req.session.userId = id
    res.json({ id })
  })

  app.post('/login', requireLogout, async (req, res) => {
    let { email, password } = req.body
    let authError = () => {
      let error = 'Invalid login'
      res.status(401).json({ error })
    }

    let user = await User.findOne({ where: { email } })
    if (user == null) return authError()

    let passwordHash = await hashPassword(password, user.passwordSalt)
    if (!passwordHash.equals(user.passwordHash)) return authError()

    let { id, name } = user
    req.session.userId = id
    res.json({ id, email, name })
  })

  app.post('/logout', requireLogin, async (req, res) => {
    delete req.session.userId
    res.json({})
  })

  app.post('/transaction', requireLogin, async (req, res) => {
    let { type, paid, txid } = req.body
    if (!([ 'btc', 'eth' ].includes(type))) {
      let error = 'Type must be "btc" or "eth"'
      return res.status(400).json({ error })
    }
    if (type === 'btc') {
      var received = paid * ATOMS_PER_BTC / 1e8
    }
    let tx = {
      type,
      paid,
      received,
      txid: Buffer(txid, 'base64'),
      userId: req.session.userId
    }
    await Transaction.create(tx)
    res.json({})
  })

  app.post('/wallet', requireLogin, async (req, res) => {
    let wallet = {
      encryptedSeed: Buffer(req.body.encryptedSeed, 'base64'),
      salt: Buffer(req.body.salt, 'base64'),
      iv: Buffer(req.body.iv, 'base64'),
      userId: req.session.userId
    }
    await Wallet.create(wallet)
    res.json({})
  })

  app.get('/transactions', requireLogin, async (req, res) => {
    let transactions = await req.user.getTransactions()
    res.json(transactions)
  })

  app.get('/wallets', requireLogin, async (req, res) => {
    let wallets = await req.user.getWallets()
    wallets = wallets.map((wallet) => ({
      encryptedSeed: wallet.encryptedSeed.toString('base64'),
      salt: wallet.salt.toString('base64'),
      iv: wallet.iv.toString('base64')
    }))
    res.json(wallets)
  })
}
