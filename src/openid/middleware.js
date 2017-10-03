'use strict';

const
	_ = require('lodash'),
	issuer = require('./shared/issuer'),
	envValidator = require('./shared/envValidator'),

	sharedFunctions = require('./shared/functions'),

	constants = require('./shared/constants'),

	EventEmitter = require('events'),

	emitter = new EventEmitter(),

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
					issuer
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	checkUserIsOnTheRequest = ({ env, req }) => {
		const
			user = req.user;

		if (!user || !user.username) {
			throw new Error('A valid User is not set on the request');
		}

		return {
			env,
			user: req.user
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

	validateAccessToken = ({ env, req, accessToken, issuer }) => {
		const issuerClient = new issuer.Client();
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
			nozomi = req.nozomi || {};

		nozomi.user = user;
		req.nozomi = nozomi;

		return undefined;
	},

	setGrant = (req) => (grant) => {

		req.user.grant = true;

		return undefined;

	},

	fail = (req, res) => error => {

		res.sendStatus(401);

		emitter.emit('deny', `Access denied to: ${req ? req.ip ? req.ip : 'unknown' : 'unknown'}, error: ${error.message}`);

	};

module.exports = {

	emitter: emitter,

	/**
	 * Validates the OpenID Connect access token passed in
	 * an HTTP Authorization header and if successful sets
	 * the user object onto the request object.
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
	 * Checks that an access token can be retrieved for the
	 * user specified on the request. Should be used in 
	 * tandem with the tokenValidator middleware, and must be
	 * executed after that. This requires that a ConnectedApp
	 * is configured to pre authorise users and the user is
	 * authorised.
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
