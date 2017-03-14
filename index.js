'use strict'

const aws = require('aws-sdk')
const createEmail = require('mailcomposer')

const ses = new aws.SES()

const from = 'Cosmos Team <matt@tendermint.com>'
const subject = 'Your Cosmos Wallet - DO NOT LOSE THIS!'
const text = `
Thank you for participating in the Cosmos Fundraiser.

Attached is your encrypted wallet file, which you will need in the future to access your Cosmos Atoms. Store this somewhere where you won't lose it. It's a good idea to keep it saved on multiple devices.

Also, remember not to lose your password. If you forget your password or lose your wallet, you will not be able to recover your Atoms!

- The Cosmos Team
`
const html = `
<h2>Thank you for participating in the Cosmos Fundraiser</h2>
<p>
  Attached is your encrypted wallet file, which you will need in the future to access your Cosmos Atoms. Store this somewhere where you won't lose it. It's a good idea to keep it saved on multiple devices.
</p>
<p>
  Also, remember to keep your password written down somewhere. <strong>If you forget your password or lose your wallet, you will not be able to recover your Atoms!</strong>
</p>
<p>
  <i>- The Cosmos Team</i>
</p>
`

exports.handler = (event, context, cb) => {
  if (event.wallet.length > 200) {
    console.log('Wallet is too big. length=' + event.wallet.length)
    return cb(Error())
  }
  createEmail({
    from,
    to: event.emailAddress,
    subject,
    text,
    html,
    attachments: [{
      filename: 'cosmos_fundraiser.wallet',
      content: Buffer(event.wallet, 'base64')
    }]
  }).build((err, data) => {
    if (err) return cb(err)
    ses.sendRawEmail({ RawMessage: { Data: data } }, (err, res) => {
      if (err) return cb(err)
      console.log('Email sent:', res)
      cb(null, '{}')
    })
  })
}
