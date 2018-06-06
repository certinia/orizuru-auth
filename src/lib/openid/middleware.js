/**
 * Copyright (c) 2017, FinancialForce.com, inc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 *   are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following disclaimer in the documentation
 *      and/or other materials provided with the distribution.
 * - Neither the name of the FinancialForce.com, inc nor the names of its contributors
 *      may be used to endorse or promote products derived from this software without
 *      specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 *  OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

'use strict';

/**
 * Express middlewares for user identitfication and authorisation.
 * It is aimed at users of the Salesforce Identity Provider and designed
 * to be used with the Orizuru framework.
 *
 * @module
 */

const
	_ = require('lodash'),
	EventEmitter = require('events'),

	issuer = require('./shared/issuer'),
	envValidator = require('./shared/envValidator'),
	sharedFunctions = require('./shared/functions'),
	constants = require('./shared/constants'),

	emitter = new EventEmitter(),

	DENIED_EVENT = 'denied',
	TOKEN_VALIDATED_EVENT = 'token_validated',
	GRANT_CHECKED_EVENT = 'grant_checked',

	extractAccessToken = ({ env, req }) => {
		// https://tools.ietf.org/html/rfc6750
		const
			authorizationHeader = req ? req.get ? req.get(constants.HTTP_AUTHORIZATION_HEADER) : null : null,
			accessToken = authorizationHeader ? authorizationHeader.substring(constants.BEARER_PREFIX.length) : null;

		if (_.isEmpty(accessToken)) {
			throw new Error('Authorization header with \'Bearer ***...\' required');
		}

		return {
			env,
			req,
			accessToken
		};
	},

	createIssuerWithAccessToken = ({ env, req, accessToken }) => {
		return issuer.getAsync(env.openidHTTPTimeout, env.openidIssuerURI)
			.then(issuer => {
				if (issuer == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					env,
					req,
					accessToken,
					issuerClient: new issuer.Client()
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	checkUserIsOnTheRequest = ({ env, req }) => {
		const
			user = _.get(req, 'orizuru.user');

		if (!user || !user.username) {
			throw new Error('A valid User is not set on the request');
		}

		return {
			env,
			user: user
		};
	},

	createIssuerWithUser = ({ env, user }) => {
		return issuer.getAsync(env.openidHTTPTimeout, env.openidIssuerURI)
			.then(issuer => {
				if (issuer == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					env,
					issuerClient: new issuer.Client(),
					user
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	validateAccessToken = ({ env, req, accessToken, issuerClient }) => {
		return issuerClient.userinfo(accessToken)
			.then(userInfo => {
				if (userInfo == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					req,
					userInfo
				};
			})
			.catch(() => {
				throw new Error('Failed to authenticate with Authorisation header');
			});
	},

	setUserOnRequest = ({ req, userInfo }) => {

		const user = {
				username: userInfo.preferred_username,
				organizationId: userInfo.organization_id
			},
			orizuru = req.orizuru || {};

		orizuru.user = user;
		req.orizuru = orizuru;

		emitter.emit(TOKEN_VALIDATED_EVENT, `Token validated for: ${req.ip}`);

		return undefined;
	},

	setGrant = (req) => (grant) => {

		req.orizuru.grantChecked = true;

		emitter.emit(GRANT_CHECKED_EVENT, `Grant checked for: ${req.ip}`);

		return undefined;

	},

	fail = (req, res) => error => {

		emitter.emit(DENIED_EVENT, `Access denied to: ${req ? req.ip ? req.ip : 'unknown' : 'unknown'}, error: ${error.message}`);

		res.sendStatus(401);

	};

module.exports = {

	emitter: emitter,

	/**
	 * @typedef ExpressMiddleware
	 * @type {function}
	 * @param {Object} req - The request.
	 * @param {Object} res - The response.
	 * @param {function} next - The next middleware handler.
	 */

	/**
	 * Returns an express middleware that validates the OpenID Connect access token passed in
	 * an HTTP Authorization header and if successful sets
	 * the user object onto the request object.
	 *
	 * @param {Object} env - The OpenID environment parameters
	 * @param {string} env.jwtSigningKey - The OpenID JWT signing private key.
	 * @param {string} env.openidClientId - The OpenID ClientID.
	 * @param {number} env.openidHTTPTimeout - The OpenID client HTTP timeout.
	 * @param {string} env.openidIssuerURI - The OpenID issuer URI.
	 * @returns {ExpressMiddleware} - The express middleware function.
	 */
	tokenValidator: env => {
		envValidator.validate(env);
		return (req, res, next) => Promise.resolve({ env, req })
			.then(extractAccessToken)
			.then(createIssuerWithAccessToken)
			.then(validateAccessToken)
			.then(setUserOnRequest)
			.then(next)
			.catch(fail(req, res));
	},

	/**
	 * Returns an express middleware that checks that an access token
	 * can be retrieved for the user specified on the request.
	 * Should be used in tandem with the tokenValidator middleware,
	 * and must be executed after that. This requires that a ConnectedApp
	 * is configured to pre authorise users and the user is
	 * authorised.
	 *
	 * @param {Object} env - The OpenID environment parameters
	 * @param {string} env.jwtSigningKey - The OpenID JWT signing private key.
	 * @param {string} env.openidClientId - The OpenID ClientID.
	 * @param {number} env.openidHTTPTimeout - The OpenID client HTTP timeout.
	 * @param {string} env.openidIssuerURI - The OpenID issuer URI.
	 * @returns {ExpressMiddleware} - The express middleware function.
	 */
	grantChecker: env => {
		envValidator.validate(env);
		return (req, res, next) => Promise.resolve({ env, req })
			.then(checkUserIsOnTheRequest)
			.then(createIssuerWithUser)
			.then(sharedFunctions.constructSignedJwt)
			.then(sharedFunctions.obtainAuthorizationGrant)
			.then(setGrant(req))
			.then(next)
			.catch(fail(req, res));
	}

};
