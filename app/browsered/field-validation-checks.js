'use strict'

// npm dependencies
const parseInt = require('lodash/parseInt')

// local dependencies
const emailValidator = require('../utils/email_tools.js')

// Constants
const NUMBERS_ONLY = new RegExp('^[0-9]+$')
const MAX_AMOUNT = 100000

const validationErrors = {
  required: 'This field cannot be blank',
  currency: 'Choose an amount in pounds and pence using digits and a decimal point. For example “10.50”',
  phoneNumber: 'Must be a 11 digit phone number',
  validEmail: 'Please use a valid email address',
  isHttps: 'URL must begin with https://',
  isAboveMaxAmount: `Choose an amount under £${MAX_AMOUNT.toLocaleString()}`,
  isPasswordLessThanTenChars: `Choose a Password of 10 characters or longer`,
  isGreaterThanMaxLengthChars: `The text is too long`
}

exports.isEmpty = function (value) {
  if (value === '') {
    return validationErrors.required
  } else {
    return false
  }
}

exports.isCurrency = function (value) {
  if (!/^([0-9]+)(?:\.([0-9]{1,2}))?$/.test(value)) {
    return validationErrors.currency
  } else {
    return false
  }
}

exports.isValidEmail = function (value) {
  if (!emailValidator(value)) {
    return validationErrors.validEmail
  } else {
    return false
  }
}

exports.isPhoneNumber = function (value) {
  const trimmedTelephoneNumber = value.replace(/\s/g, '')
  if (trimmedTelephoneNumber.length < 11 || !NUMBERS_ONLY.test(trimmedTelephoneNumber)) {
    return validationErrors.phoneNumber
  } else {
    return false
  }
}

exports.isHttps = function (value) {
  if (value.substr(0, 8) !== 'https://') {
    return validationErrors.isHttps
  } else {
    return false
  }
}

exports.isAboveMaxAmount = value => {
  if (!exports.isCurrency(value) && parseFloat(value) > MAX_AMOUNT) {
    return validationErrors.isAboveMaxAmount
  }
  return false
}

exports.isFieldGreaterThanMaxLengthChars = (value, maxLength) => {
  let parsedMaxLength = parseInt(maxLength)
  return parsedMaxLength && value.length > parsedMaxLength ? validationErrors.isGreaterThanMaxLengthChars : false
}

exports.isPasswordLessThanTenChars = value => !value || value.length < 10 ? validationErrors.isPasswordLessThanTenChars : false
