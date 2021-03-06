'use strict'

// NPM dependencies
const logger = require('winston')

// Local dependencies
const {response} = require('../../utils/response.js')
const paths = require('../../paths')
const productsClient = require('../../services/clients/products_client.js')
const authService = require('../../services/auth_service.js')
const errorView = require('../../utils/response.js').renderErrorView

const PAGE_PARAMS = {
  returnToStart: paths.paymentLinks.start,
  manage: paths.paymentLinks.manage
}

module.exports = (req, res) => {
  productsClient.product.getByGatewayAccountId(authService.getCurrentGatewayAccountId(req))
    .then(products => {
      const paymentLinks = products.filter(product => product.type === 'ADHOC')
      PAGE_PARAMS.productsLength = paymentLinks.length
      PAGE_PARAMS.products = paymentLinks
      return response(req, res, 'payment-links/manage', PAGE_PARAMS)
    })
    .catch((err) => {
      logger.error(`[requestId=${req.correlationId}] Get ADHOC product by gateway account id failed - ${err.message}`)
      errorView(req, res, 'Internal server error')
    })
}
