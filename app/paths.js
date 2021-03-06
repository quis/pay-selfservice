'use strict'

const path = require('path')

module.exports = {
  transactions: {
    index: '/transactions',
    download: '/transactions/download',
    detail: '/transactions/:chargeId',
    refund: '/transactions/:chargeId/refund'
  },
  credentials: {
    index: '/credentials',
    edit: '/credentials/edit',
    create: '/credentials'
  },
  notificationCredentials: {
    index: '/credentials',
    edit: '/notification-credentials/edit',
    update: '/notification-credentials'
  },
  user: {
    logIn: '/login',
    profile: '/my-profile',
    otpLogIn: '/otp-login',
    otpSendAgain: '/otp-send-again',
    otpSetup: '/otp-setup',
    logOut: '/logout',
    callback: '/callback',
    noAccess: '/noaccess',
    forgottenPassword: '/reset-password',
    passwordRequested: '/reset-password-requested',
    forgottenPasswordReset: '/reset-password/:id'
  },
  dashboard: {
    index: '/'
  },
  apiKeys: {
    index: '/tokens',
    revoked: '/tokens/revoked',
    // we only show the token once, hence strange url
    show: '/tokens/generate',
    create: '/tokens/generate',
    // should these two not rely take an id in the url?
    update: '/tokens',
    delete: '/tokens'
  },
  paymentTypes: {
    selectType: '/card-types/manage-type',
    selectBrand: '/card-types/manage-brand',
    summary: '/card-types/summary'
  },
  emailNotifications: {
    index: '/email-notifications',
    edit: '/email-notifications/edit',
    confirm: '/email-notifications/confirm',
    update: '/email-notifications/update',
    off: '/email-notifications/off',
    offConfirm: '/email-notifications/off-confirm',
    on: '/email-notifications/on'
  },
  serviceSwitcher: {
    index: '/my-services',
    switch: '/my-services/switch',
    create: '/my-services/create'
  },
  editServiceName: {
    index: '/service/:externalServiceId/edit-name',
    update: '/service/:externalServiceId/edit-name'
  },
  merchantDetails: {
    index: '/merchant-details',
    update: '/merchant-details'
  },
  teamMembers: {
    index: '/service/:externalServiceId',
    show: '/service/:externalServiceId/team-member/:externalUserId',
    delete: '/service/:externalServiceId/team-member/:externalUserId/delete',
    permissions: '/service/:externalServiceId/team-member/:externalUserId/permissions',
    invite: '/service/:externalServiceId/team-members/invite'
  },
  inviteValidation: {
    validateInvite: '/invites/:code'
  },
  registerUser: {
    registration: '/register',
    subscribeService: '/subscribe',
    otpVerify: '/verify-otp',
    reVerifyPhone: '/re-verify-phone',
    logUserIn: '/proceed-to-login'
  },
  selfCreateService: {
    register: '/create-service/register',
    confirm: '/create-service/confirm',
    otpVerify: '/create-service/verify-otp',
    otpResend: '/create-service/resend-otp',
    logUserIn: '/create-service/proceed-to-login',
    serviceNaming: '/service/set-name'
  },
  toggle3ds: {
    index: '/3ds',
    onConfirm: '/3ds/confirm',
    on: '/3ds/on',
    off: '/3ds/off'
  },
  healthcheck: {
    path: '/healthcheck'
  },
  staticPaths: {
    naxsiError: '/request-denied'
  },
  prototyping: {
    demoService: {
      index: '/test-with-your-users',
      links: '/test-with-your-users/links',
      create: '/test-with-your-users/create',
      confirm: '/test-with-your-users/confirm',
      disable: '/test-with-your-users/links/disable/:productExternalId'
    },
    demoPayment: {
      index: '/make-a-demo-payment',
      editDescription: '/make-a-demo-payment/edit-description',
      editAmount: '/make-a-demo-payment/edit-amount',
      mockCardDetails: '/make-a-demo-payment/mock-card-numbers',
      goToPaymentScreens: '/make-a-demo-payment/go-to-payment'
    }
  },
  paymentLinks: {
    start: '/create-payment-link',
    information: '/create-payment-link/information',
    amount: '/create-payment-link/amount',
    review: '/create-payment-link/review',
    manage: '/create-payment-link/manage',
    disable: '/create-payment-link/manage/delete/:productExternalId'
  },
  generateRoute: require(path.join(__dirname, '/utils/generate_route.js'))
}
