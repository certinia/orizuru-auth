'use strict';

module.exports = {
	openid: {
		middleware: require('./openid/middleware'),
		grant: require('./openid/grant')
	}
};
