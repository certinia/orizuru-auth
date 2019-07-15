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
 * @module client/openid
 */

import axios from 'axios';

import { Environment } from './cache';
import { AccessTokenResponse, GrantOptions, GrantParams, OAuth2Client, ResponseFormat } from './oauth2';
import { JWT, OAuth2JWTClient } from './oauth2Jwt';
import { decodeIdToken } from './openid/identity';

const DEFAULT_USERINFO_OPTIONS = Object.freeze({
	responseFormat: 'application/json'
});
export interface OpenIDAccessTokenResponse extends AccessTokenResponse {

	/**
	 * An [OpenID Token](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) that contains claims about the authentication of an end-user by an
	 * authorization server.
	 */
	id_token?: null | string | OpenIDToken | OpenIDTokenWithStandardClaims;

}

/**
 * A token that conforms to the [OpenID specification](https://openid.net/specs/openid-connect-core-1_0.html#IDToken).
 *
 * It is returned in the `id_token` field of the `AccessTokenResponse`.
 */
export interface OpenIDToken extends JWT {

	/**
	 * Authentication Context Class Reference Claim.
	 */
	acr?: string;

	/**
	 * Authentication Methods References Claim.
	 */
	amr?: string;

	/**
	 * Access Token Hash Value Claim.
	 */
	at_hash?: string;

	/**
	 * User Authentication Time Claim;
	 */
	auth_time?: string;

	/**
	 * Authorized Party Claim.
	 */
	azp?: string;

	/**
	 * @inheritdoc
	 */
	iat: number;

	/**
	 * String value used to associate a Client session with an ID Token, and to mitigate replay attacks claim.
	 */
	nonce?: string;

}

/**
 * [Address claim](https://openid.net/specs/openid-connect-core-1_0.html#AddressClaim)
 */
export interface OpenIdTokenAddress {

	/**
	 * Full mailing address,
	 */
	formatted?: string;

	/**
	 * Full street address.
	 */
	street_address?: string;

	/**
	 * City or locality component.
	 */
	locality?: string;

	/**
	 * State, province, prefecture, or region component.
	 */
	region?: string;

	/**
	 * Zip code or postal code component.
	 */
	postal_code?: string;

	/**
	 * Country name component.
	 */
	country?: string;

}

/**
 * Standard set of claims returned in a userinfo request.
 *
 * The standard claims conform to the [OpenID specification](https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims).
 */
export interface OpenIDTokenWithStandardClaims extends OpenIDToken {

	/**
	 * End-User's preferred address.
	 *
	 * The value of the address member is a JSON [RFC4627] structure containing some or
	 * all of the members defined [here](https://openid.net/specs/openid-connect-core-1_0.html#AddressClaim).
	 */
	address?: OpenIdTokenAddress;

	/**
	 * End-User's birthday, represented as an ISO 8601:2004 [ISO8601‑2004] YYYY-MM-DD format.
	 * The year MAY be 0000, indicating that it is omitted.
	 * To represent only the year, YYYY format is allowed.
	 */
	birthdate?: string;

	/**
	 * End-User's preferred e-mail address.
	 *
	 * Its value MUST conform to the RFC 5322 [RFC5322] addr-spec syntax.
	 * This value MUST NOT be relied upon to be unique by the RP, as discussed in Section 2.5.3.
	 */
	email: string;

	/**
	 * True if the End-User's e-mail address has been verified; otherwise false.
	 * When this Claim Value is true, this means that the OP took affirmative steps to ensure that
	 * this e-mail address was controlled by the End-User at the time the verification was performed.
	 * The means by which an e-mail address is verified is context-specific, and dependent upon the
	 * trust framework or contractual agreements within which the parties are operating.
	 */
	email_verified: boolean;

	/**
	 * Surname(s) or last name(s) of the End-User.
	 */
	family_name: string;

	/**
	 * End-User's gender.
	 */
	gender?: string;

	/**
	 * Given name(s) or first name(s) of the End-User.
	 */
	given_name: string;

	/**
	 * End-User's locale, represented as a BCP47 [RFC5646] language tag.
	 */
	locale: string;

	/**
	 * Middle name(s) of the End-User.
	 */
	middle_name?: string;

	/**
	 * End-User's full name in displayable form including all name parts, possibly including
	 * titles and suffixes, ordered according to the End-User's locale and preferences.
	 */
	name: string;

	/**
	 * Casual name of the End-User that may or may not be the same as the given_name.
	 * For instance, a nickname value of Mike might be returned alongside a given_name value of Michael.
	 */
	nickname: string;

	/**
	 * End-User's preferred telephone number.
	 *
	 * E.164 [E.164] is recommended as the format of this Claim, for example, +1 (425) 555-1212 or +56 (2) 687 2400.
	 * If the phone number contains an extension, it is recommended that the extension be represented using
	 * the RFC 3966 [RFC3966] extension syntax, for example, +1 (604) 555-1234;ext=5678.
	 */
	phone_number: string | null;

	/**
	 * True if the End-User's phone number has been verified; otherwise false.
	 *
	 * When this Claim Value is true, this means that the OP took affirmative steps to ensure that this phone number
	 * was controlled by the End-User at the time the verification was performed.
	 * The means by which a phone number is verified is context-specific, and dependent upon the trust framework or
	 * contractual agreements within which the parties are operating. When true, the phone_number
	 * Claim MUST be in E.164 format and any extensions MUST be represented in RFC 3966 format.
	 */
	phone_number_verified?: boolean;

	/**
	 * URL of the End-User's profile picture.
	 *
	 * This URL MUST refer to an image file (for example, a PNG, JPEG, or GIF image file),
	 * rather than to a Web page containing an image. Note that this URL should specifically
	 * reference a profile photo of the End-User suitable for displaying when describing
	 * the End-User, rather than an arbitrary photo taken by the End-User.
	 */
	picture: string;

	/**
	 * Shorthand name that the End-User wishes to be referred to at the RP, such as janedoe or j.doe.
	 * This value MAY be any valid JSON string including special characters such as @, /, or whitespace.
	 * This value MUST NOT be relied upon to be unique by the RP.
	 */
	preferred_username: string;

	/**
	 * URL of the End-User's profile page.
	 *
	 * The contents of this Web page should be about the End-User.
	 */
	profile: string;

	/**
	 * Time the End-User's information was last updated.
	 *
	 * The time is represented as the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
	 */
	updated_at: number;

	/**
	 * URL of the End-User's Web page or blog.
	 *
	 * This Web page should contain information published by the End-User or an organization that the End-User is affiliated with.
	 */
	website?: string;

	/**
	 * String from zoneinfo [zoneinfo] time zone database representing the End-User's time zone.
	 * For example, Europe/Paris or America/Los_Angeles.
	 */
	zoneinfo: string;

}

/**
 * Optional parameters used when requesting user information.
 */
export interface UserInfoOptions {

	/**
	 * Returns the response format, either JSON, XML or URL_ENCODED.
	 */
	responseFormat?: ResponseFormat;

}

/**
 * An OpenID client that implements the [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html).
 */
export class OpenIdClient extends OAuth2JWTClient {

	/**
	 * [UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
	 */
	private userinfoEndpoint?: string;

	/**
	 * Creates a new OpenID client with the given environment.
	 *
	 * @param env The OAuth2 environment parameters.
	 */
	constructor(env: Environment) {
		super(env);
		this.clientType = 'OpenID';
	}

	/**
	 * Initalize the OpenIdClient by requesting the [OpenID provider configuration information](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)
	 * for the issuer provided in the environment.
	 */
	public async init() {

		const uri = `${this.env.issuerURI.replace(/\/$/, '')}/.well-known/openid-configuration`;
		const response = await axios.get(uri, Object.assign({}, OAuth2Client.DEFAULT_REQUEST_CONFIG, {
			timeout: this.env.httpTimeout
		}));

		if (response.status !== 200) {
			throw new Error(`Failed to initialise ${this.clientType} client. OpenID configuration request failed.`);
		}

		const data = response.data;

		this.authorizationEndpoint = data.authorization_endpoint;
		this.introspectionEndpoint = data.introspection_endpoint;
		this.revocationEndpoint = data.revocation_endpoint;
		this.tokenEndpoint = data.token_endpoint;
		this.userinfoEndpoint = data.userinfo_endpoint;

	}

	/**
	 * @inheritdoc
	 * @returns The OpenID Access Token Response.
	 */
	public async grant(params: GrantParams, opts?: GrantOptions): Promise<OpenIDAccessTokenResponse> {
		return super.grant(params as GrantParams, opts);
	}

	/**
	 * Retrieve the user information using the provided token.
	 *
	 * @param token The token to be used.
	 * @param [opts] The user info options to be used.
	 */
	public async userinfo(token: string, opts?: UserInfoOptions): Promise<string | OpenIDTokenWithStandardClaims> {

		if (!this.userinfoEndpoint) {
			throw new Error(`${this.clientType} client has not been initialized`);
		}

		const internalOpts = Object.assign({}, DEFAULT_USERINFO_OPTIONS, opts);

		const config = Object.assign({}, OAuth2Client.DEFAULT_REQUEST_CONFIG, {
			headers: {
				Accept: internalOpts.responseFormat,
				Authorization: `Bearer ${token}`
			}
		});

		const response = await axios.get(this.userinfoEndpoint, config);

		if (response.status !== 200) {
			throw new Error(`Failed to obtain user information: ${response.data}.`);
		}

		return response.data;

	}

	/**
	 * @inheritdoc
	 */
	protected handleAccessTokenResponse(accessTokenResponse: AccessTokenResponse, internalOpts: GrantOptions) {

		try {

			if (internalOpts.decodeIdToken) {
				decodeIdToken(accessTokenResponse);
			}

		} catch (error) {
			throw new Error(`Failed to obtain grant: ${error.message}.`);
		}

		return accessTokenResponse as OpenIDAccessTokenResponse;

	}

}
