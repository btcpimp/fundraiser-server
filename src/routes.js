'use strict'

const promisify = require('bluebird').promisify
let { pbkdf2, randomBytes } = require('crypto')
pbkdf2 = promisify(pbkdf2)
randomBytes = promisify(randomBytes)

const requireLogin = (req, res, next) => {
  if (req.session.userId == null) {
    let error = 'Must be logged in'
    return res.status(401).json({ error })
  }
  next()
}

async function hashPassword (password, salt) {
  return await pbkdf2(
    Buffer(password), salt, 20000, 20, 'sha512')
}

module.exports = function (app, models) {
  let { User, Transaction, Wallet } = models

  app.post('/register', async (req, res) => {
    let { email, name, password } = req.body
    // TODO: validate fields
    let passwordSalt = await randomBytes(20)
    let passwordHash = await hashPassword(password, passwordSalt)
    let { id } = await User.create({ email, name, passwordSalt, passwordHash })
    res.json({ id })
  })

  app.post('/login', async (req, res) => {
    if (req.session.userId != null) {
      let error = 'Already logged in'
      return res.status(401).json({ error })
    }

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

  app.post('/wallet', async (req, res) => {

  })

  app.get('/transactions', async (req, res) => {

  })

  app.get('/wallets', async (req, res) => {

  })
}
