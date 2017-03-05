'use strict'

const promisify = require('bluebird').promisify
let { pbkdf2, randomBytes } = require('crypto')
pbkdf2 = promisify(pbkdf2)
randomBytes = promisify(randomBytes)
let { pushTx, ATOMS_PER_BTC } = require('cosmos-fundraiser').bitcoin
pushTx = promisify(pushTx)

const DEV = process.env.NODE_ENV === 'development'

async function hashPassword (password, salt) {
  return await pbkdf2(
    Buffer(password), salt, 20000, 20, 'sha512')
}

async function saltAndHashPassword (password) {
  let passwordSalt = await randomBytes(20)
  let passwordHash = await hashPassword(password, passwordSalt)
  return { passwordSalt, passwordHash }
}

async function getWallets (user) {
  let wallets = await user.getWallets()
  return wallets.map((wallet) => ({
    encryptedSeed: wallet.encryptedSeed.toString('base64'),
    salt: wallet.salt.toString('base64'),
    iv: wallet.iv.toString('base64')
  }))
}

function handleErrors (func) {
  return async function (req, res, next) {
    try {
      await func(req, res, next)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  }
}

async function getUser (req, res) {
  let { email, displayName, id } = req.user
  let wallets = await getWallets(req.user)
  res.json({ email, displayName, id, wallets })
}

function requireLogout (req, res, next) {
  if (req.session.userId != null) {
    let error = 'Already logged in'
    return res.status(401).json({ error })
  }
  next()
}

module.exports = function (app, models) {
  let { User, Wallet } = models

  async function requireLogin (req, res, next) {
    let userId = req.session.userId
    if (userId == null) {
      let error = 'Must be logged in'
      return res.status(401).json({ error })
    }
    req.user = await User.findById(userId)
    next()
  }

  app.post('/register', requireLogout, handleErrors(async (req, res) => {
    let { email, displayName, password } = req.body
    // TODO: validate fields
    let { passwordSalt, passwordHash } = await saltAndHashPassword(password)
    let user = await User.create({ email, displayName, passwordSalt, passwordHash })
    req.session.userId = user.id
    req.user = user
    await getUser(req, res)
  }))

  // update display name
  app.post('/name', requireLogin, handleErrors(async (req, res) => {
    if (!req.body.name) {
      return res.status(400).json({ error: 'No name given' })
    }
    await req.user.update({ displayName: req.body.name })
    await getUser(req, res)
  }))

  // update email address
  app.post('/email', requireLogin, handleErrors(async (req, res) => {
    if (!req.body.email) {
      return res.status(400).json({ error: 'No email given' })
    }
    await req.user.update({ email: req.body.email })
    await getUser(req, res)
  }))

  // update password
  app.post('/password', requireLogin, handleErrors(async (req, res) => {
    if (!req.body.password) {
      return res.status(400).json({ error: 'No password given' })
    }
    let saltAndHash = await saltAndHashPassword(req.body.password)
    await req.user.update(saltAndHash)
    await getUser(req, res)
  }))

  app.post('/login', requireLogout, handleErrors(async (req, res) => {
    let { email, password } = req.body
    let authError = () => {
      let error = 'Invalid login'
      res.status(401).json({ error })
    }

    let user = await User.findOne({ where: { email } })
    if (user == null) return authError()

    let passwordHash = await hashPassword(password, user.passwordSalt)
    if (!passwordHash.equals(user.passwordHash)) return authError()

    req.session.userId = user.id
    req.user = user
    await getUser(req, res)
  }))

  app.post('/logout', requireLogin, handleErrors(async (req, res) => {
    delete req.session.userId
    res.json({})
  }))

  app.post('/wallet', requireLogin, handleErrors(async (req, res) => {
    let wallet = {
      encryptedSeed: Buffer(req.body.encryptedSeed, 'base64'),
      salt: Buffer(req.body.salt, 'base64'),
      iv: Buffer(req.body.iv, 'base64'),
      userId: req.session.userId
    }
    await Wallet.create(wallet)
    res.json({})
  }))

  app.get('/wallets', requireLogin, handleErrors(async (req, res) => {
    let wallets = await getWallets(req.user)
    res.json(wallets)
  }))

  app.get('/user', requireLogin, handleErrors(getUser))

  if (DEV) {
    app.post('/pushtx', requireLogin, handleErrors(async (req, res) => {
      let tx = { toHex: () => req.body.hex }
      let pushTxRes = await pushTx(tx, { testnet: true })
      res.json(pushTxRes)
    }))
  }
}
