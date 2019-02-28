const fs = require('fs');

// configure for Slack
const { SLACK_WEBHOOK_URL } = require('config/vars');
const { IncomingWebhook } = require('@slack/client');
let incomingWebhook: any = null
if (SLACK_WEBHOOK_URL) {
  incomingWebhook = new IncomingWebhook(SLACK_WEBHOOK_URL);
}

// configure for emailing
const { EMAIL_MAILGUN_API_KEY, EMAIL_FROM_SUPPORT, EMAIL_MAILGUN_DOMAIN, EMAIL_TEMPLATE_BASE } = require('config/vars');
const Handlebars = require('handlebars');

// load template file & inject data => return content with injected data.
const template = (fileName: string, data: any) => {
  const content = fs.readFileSync(EMAIL_TEMPLATE_BASE + '' + fileName).toString();
  var inject = Handlebars.compile(content);
  return inject(data);
}

// --------- Email Templates --------- //

export function welcomeEmail ({ name, email }:{ name: string, email: string }) {
  return {
    from: EMAIL_FROM_SUPPORT,
    to: `${name} <${email}>`,
    subject: `Welcome!`,
    text: template('welcome.txt', arguments[0]),
    html: template('welcome.html', arguments[0]),
  }
}

// resetPswEmail, forgotPswEmail, etc.

// --------- Nodemailer and Mailgun setup --------- //
const nodemailer = require('nodemailer');
const mailgunTransport = require('nodemailer-mailgun-transport');
let emailClient: any = null
if (EMAIL_MAILGUN_API_KEY) {
  // Configure transport options
  const mailgunOptions = {
    auth: {
      api_key: EMAIL_MAILGUN_API_KEY, // process.env.MAILGUN_ACTIVE_API_KEY,
      domain: EMAIL_MAILGUN_DOMAIN // process.env.MAILGUN_DOMAIN,
    }
  };
  const transport = mailgunTransport(mailgunOptions);
  emailClient = nodemailer.createTransport(transport);
}

export function sendEmail(data: any) {
  return new Promise((resolve, reject) => {
    emailClient ? emailClient.sendMail(
      data,
      (err: any, info: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(info);
        }
      }
    ) : '';
  });
}

// send slack message using incoming webhook url
// @example: slackWebhook('message')
export function slackWebhook(message: string) {
  incomingWebhook ? incomingWebhook.send(message) : '';
}
