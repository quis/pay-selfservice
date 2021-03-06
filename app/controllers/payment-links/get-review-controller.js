'use strict'

// NPM dependencies
const lodash = require('lodash')

// Local dependencies
const {response} = require('../../utils/response.js')
const paths = require('../../paths')

module.exports = (req, res) => {
  const pageData = lodash.get(req, 'session.pageData.createPaymentLink', {})

  return response(req, res, 'payment-links/review', {
    pageData,
    paymentLinkTitle: pageData.paymentLinkTitle,
    paymentLinkDescription: pageData.paymentLinkDescription,
    paymentLinkAmount: pageData.paymentLinkAmount,
    nextPage: paths.paymentLinks.review,
    changeInformation: paths.paymentLinks.information,
    changeAmount: paths.paymentLinks.amount,
    returnToStart: paths.paymentLinks.start,
    manage: paths.paymentLinks.manage
  })
}
