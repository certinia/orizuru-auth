'use strict';

/**
 * Nozomi Auth module.
 * @module
 * @see module:openid/middleware
 * @see module:openid/grant
 */

module.exports = {
	/**
	 * The express middlewares module.
	 */
	middleware: require('./openid/middleware'),
	/**
	 * The token granter module.
	 */
	grant: require('./openid/grant')
};
