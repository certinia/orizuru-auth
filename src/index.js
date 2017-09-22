'use strict';

module.exports = {
	openid: {
		auth: require('./openid/auth'),
		grant: require('./openid/grant')
	}
};
