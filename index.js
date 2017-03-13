'use strict'

const aws = require('aws-sdk')
const createEmail = require('mailcomposer')

aws.config.region = process.env.AWS_REGION
aws.config.credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
}
const ses = new aws.SES()

const from = 'Cosmos Team <matt@tendermint.com>'
const to = 'mappum@gmail.com' // TODO: get from body

const subject = 'Your Cosmos Wallet - DO NOT LOSE THIS!'
const text = `
TODO: text body
`
const html = `
<span><strong>TODO:</strong> HTML body</span>
`

exports.handler = (event, context, cb) => {
  createEmail({
    from,
    to,
    subject,
    text,
    html,
    attachments: [{
      filename: 'text1.txt',
      content: 'hello world!'
    }]
  }).build((err, data) => {
    if (err) return cb(err)
    ses.sendRawEmail({ RawMessage: { Data: data } }, (err, res) => {
      if (err) return cb(err)
      console.log('Email sent:', res)
      cb(null, 'OK')
    })
  })
}
