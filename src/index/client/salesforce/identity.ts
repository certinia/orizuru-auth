/*
 * Copyright (c) 2019, FinancialForce.com, inc
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
 */

/**
 * @module client/salesforce/identity
 */

import crypto from 'crypto';

import { AccessTokenResponse } from '../oauth2';
import { OpenIDAccessTokenResponse } from '../openid';
import { SalesforceAccessTokenResponse } from '../salesforce';

/**
 * The Salesforce User Identity Information.
 *
 * This information is found in the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm#response) response.
 */
export interface SalesforceIdentity {

	/**
	 * Returns true if the user is active.
	 */
	active: boolean;

	/**
	 * Returns the city specified in the address of the user’s settings.
	 */
	addr_city: string | null;

	/**
	 * Returns the country specified in the address of the user’s settings.
	 */
	addr_country: string;

	/**
	 * Returns the state specified in the address of the user’s setting.
	 */
	addr_state: string | null;

	/**
	 * Returns the street specified in the address of the user’s settings.
	 */
	addr_street: string | null;

	/**
	 * Returns the zip or postal code specified in the address of the user’s settings.
	 */
	addr_zip: string | null;

	/**
	 * Returns true if the specified access token was issued for this identity.
	 */
	asserted_user: boolean;

	/**
	 * Returns the display name (full name) of the queried user.
	 */
	display_name: string;

	/**
	 * Returns the user's preferred e-mail address.
	 */
	email: string;

	/**
	 * Returns true if the End-User's e-mail address has been verified; otherwise false.
	 */
	email_verified: boolean;

	/**
	 * Return the user's first name.
	 */
	first_name: string;

	/**
	 * Returns the Identity URL (the same URL that was queried).
	 */
	id: string;

	/**
	 * Returns true if the user is a lightning login user;
	 */
	is_lightning_login_user?: boolean;

	/**
	 * Returns the user's language.
	 */
	language: string;

	/**
	 * Returns the last modification of the user record.
	 */
	last_modified_date: string;

	/**
	 * Returns the user's last name.
	 */
	last_name: string;

	/**
	 * Returns the mobile phone number specified in the user’s settings.
	 */
	mobile_phone: string | null;

	/**
	 * Returns true if the user has verified the mobile phone number.
	 */
	mobile_phone_verified: boolean;

	/**
	 * Returns the user's Community nickname.
	 */
	nick_name: string;

	/**
	 * Returns the user's organization ID.
	 */
	organization_id: string;

	/**
	 * Returns the user's profile pictures.
	 */
	photos: {
		[index: string]: string | null;
	};

	/**
	 * Returns the user’s current Chatter status.
	 */
	status: {
		[index: string]: string | null;
	};

	/**
	 * Returns the time zone specified in the user’s settings.
	 */
	timezone: string;

	/**
	 * Map containing various API endpoints that can be used with the specified user.
	 */
	urls: {
		[index: string]: string | null;
	};

	/**
	 * Returns the user's id.
	 */
	user_id: string;

	/**
	 * Returns the user's user type.
	 */
	user_type: string;

	/**
	 * Returns the Salesforce user name.
	 */
	username: string;

	/**
	 * Returns the offset from UTC of the time zone for the user, in milliseconds.
	 */
	utcOffset: number;

}

/**
 * Parse the user information from the `id` property of an access token response.
 *
 * It is assumed that the `id` conforms to the Salesforce [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm) format.
 *
 * @param accessTokenResponse The Salesforce access token response.
 */
export function parseUserInfo(accessTokenResponse: SalesforceAccessTokenResponse) {

	if (accessTokenResponse.id) {

		const idUrls = accessTokenResponse.id.split('/');
		const id = idUrls.pop();
		const organizationId = idUrls.pop();

		if (!id || (id.length !== 15 && id.length !== 18)) {
			throw new Error('User ID not present');
		}

		if (!organizationId || (organizationId.length !== 15 && organizationId.length !== 18)) {
			throw new Error('Organization ID not present');
		}

		accessTokenResponse.userInfo = Object.assign({
			id,
			organizationId,
			url: accessTokenResponse.id,
			validated: false
		}, accessTokenResponse.userInfo);

	} else {
		throw new Error('No id present');
	}

}

/**
 * [Verifies the signature](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#grant_access_token) of the access token response.
 *
 * Used to verify that the identity URL hasn’t changed since the server sent it.
 *
 * @param clientSecret The client secret for your application.
 * @param accessTokenResponse The Salesforce access token response.
 */
export function verifySignature(clientSecret: string, accessTokenResponse: SalesforceAccessTokenResponse) {

	if (accessTokenResponse.signature) {

		const hmac = crypto.createHmac('sha256', clientSecret);
		hmac.update(`${accessTokenResponse.id}${accessTokenResponse.issued_at}`);

		const expectedSignature = Buffer.from(hmac.digest('base64'));
		const actualSignature = Buffer.from(accessTokenResponse.signature);

		if (expectedSignature.length !== actualSignature.length) {
			throw new Error('Invalid signature');
		}

		if (!crypto.timingSafeEqual(expectedSignature, actualSignature)) {
			throw new Error('Invalid signature');
		}

		accessTokenResponse.userInfo = {
			url: accessTokenResponse.id,
			validated: true
		};

	} else {
		throw new Error('No signature present');
	}

}

/**
 * Determines whether the token is a Salesforce access token response.
 *
 * @param token The access token response.
 * @returns A boolean indicating if this token is a Salesforce access token response.
 */
export function isSalesforceAccessTokenResponse(token: AccessTokenResponse | OpenIDAccessTokenResponse | SalesforceAccessTokenResponse): token is SalesforceAccessTokenResponse {
	return (token as SalesforceAccessTokenResponse).id !== undefined
		|| (token as SalesforceAccessTokenResponse).instance_url !== undefined
		|| (token as SalesforceAccessTokenResponse).issued_at !== undefined
		|| (token as SalesforceAccessTokenResponse).signature !== undefined;
}
