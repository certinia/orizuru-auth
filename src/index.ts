/*
 * Copyright (c) 2017-2019, FinancialForce.com, inc
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
 * Orizuru Auth module.
 */

import { refreshToken } from './flow/refreshToken';
import { webServer } from './flow/webServer';

import { revocation } from './revocation/revoke';

import { grant } from './openid/grant';
import { middleware } from './openid/middleware';

export { AccessTokenResponse } from './flow/response/accessToken';
export { SalesforceJwt } from './flow/response/salesforceJwt';
export { SalesforceJwtStandardClaims } from './flow/response/salesforceJwtStandardClaims';

export { getUserInfo, UserInformation } from './openid/shared/userinfo';

const flow = {
	refreshToken,
	webServer
};

export {
	flow,
	grant,
	middleware,
	revocation
};

declare global {

	namespace Express {

		interface Request {
			orizuru?: Orizuru.Context;
		}

	}

	namespace Orizuru {

		interface Context {
			grantChecked?: boolean;
			user?: User;
		}

		namespace Options {

			interface IServer {
				auth: Environment;
			}

		}

	}
}

/**
 * The return formats when requesting a grant.
 */
export enum ResponseFormat {
	JSON = 'application/json',
	URL_ENCODED = 'application/x-www-form-urlencoded',
	XML = 'application/xml'
}

/**
 * The access token response.
 *
 * @example
 * ```json
 *
 * {
 * 	"id": "https://login.salesforce.com/id/00Dx0000000BV7z/005x00000012Q9P",
 * 	"issued_at": "1278448101416",
 * 	"refresh_token": "5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==",
 * 	"instance_url": "https://yourInstance.salesforce.com/",
 * 	"signature": "CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=",
 * 	"access_token": "00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4",
 * 	"token_type": "Bearer",
 * 	"scope": "id api refresh_token"
 * }
 * ```
 */
export interface AccessTokenResponse {

	/**
	 * Salesforce session ID that can be used with the web services API.
	 */
	access_token: string;

	/**
	 * Value is Bearer for all responses that include an access token.
	 */
	token_type: string;

	/**
	 * Salesforce value conforming to the OpenID Connect specifications.
	 * This parameter is returned only if the scope parameter includes openid.
	 */
	id_token?: null | string | OpenIDToken | OpenIDTokenWithStandardClaims;

	/**
	 * Token that can be used in the future to obtain new access tokens (sessions).
	 * This value is a secret. Treat it like the user’s password, and use appropriate measures to protect it.
	 * This parameter is returned only if your connected app is set up with a scope of at least refresh_token.
	 */
	refresh_token?: string;

	/**
	 * A URL indicating the instance of the user’s org. For example: https://yourInstance.salesforce.com/.
	 */
	instance_url: string;

	/**
	 * Identity URL that can be used to both identify the user and query for more information about the user.See Identity URLs.
	 */
	id: string;

	/**
	 * This parameter is returned if the scope parameter includes openid.
	 */
	scope?: string;

	/**
	 * If the user is a member of a Salesforce community, the community URL is provided.
	 */
	sfdc_community_url?: string;

	/**
	 * If the user is a member of a Salesforce community, the user’s community ID is provided.
	 */
	sfdc_community_id?: string;

	/**
	 * Base64-encoded HMAC-SHA256 signature signed with the client_secret (private key) containing the
	 * concatenated ID and issued_at. Used to verify that the identity URL hasn’t changed since the
	 * server sent it.
	 */
	signature: string;

	/**
	 * When the signature was created.
	 */
	issued_at: string;

	userInfo?: UserInfo;

}

/**
 * The OpenID environment parameters.
 */
export interface Environment {
	jwtSigningKey: string;
	openidClientId: string;
	openidClientSecret: string;
	openidHTTPTimeout: number;
	openidIssuerURI: string;
}

/**
 * A token that conforms to the [OpenID specification](https://openid.net/specs/openid-connect-basic-1_0-28.html#id_token).
 *
 * It is returned in the `id_token` field of the `AccessTokenResponse`.
 */
export interface OpenIDToken {

	/**
	 * Authentication Context Class Reference.
	 *
	 * > String specifying an Authentication Context Class Reference value that
	 * identifies the Authentication Context Class that the authentication
	 * performed satisfied. The value "0" indicates the End-User
	 * authentication did not meet the requirements of ISO/IEC 29115
	 * [ISO29115] level 1. Authentication using a long-lived browser cookie,
	 * for instance, is one example where the use of "level 0" is appropriate.
	 * Authentications with level 0 SHOULD never be used to authorize
	 * access to any resource of any monetary value. An absolute URI or a
	 * registered name [RFC6711] SHOULD be used as the acr value;
	 * registered names MUST NOT be used with a different meaning than
	 * that which is registered. Parties using this claim will need to agree
	 * upon the meanings of the values used, which may be context-specific.
	 * The acr value is a case sensitive string.
	 */
	acr?: string;

	/**
	 * Authentication Methods References.
	 *
	 * > JSON array of strings that are identifiers for authentication methods
	 * used in the authentication. For instance, values might indicate that
	 * both password and OTP authentication methods were used. The
	 * definition of particular values to be used in the amr Claim is beyond
	 * the scope of this specification. Parties using this claim will need to
	 * agree upon the meanings of the values used, which may be context-
	 * specific. The amr value is an array of case sensitive strings.
	 */
	amr?: string;

	/**
	 * Access Token hash value.
	 *
	 * > This is OPTIONAL when the ID Token is issued from the Token
	 * Endpoint, which is the case for this profile; nonetheless, an at_hash
	 * Claim MAY be present.Its value is the base64url encoding of the left -
	 * most half of the hash of the octets of the ASCII representation of the
	 * access_token value, where the hash algorithm used is the hash
	 * algorithm used in the alg parameter of the ID Token's JWS [JWS]
	 * header. For instance, if the alg is RS256, hash the access_token value
	 * with SHA-256, then take the left-most 128 bits and base64url encode
	 * them. The at_hash value is a case sensitive string.
	 */
	at_hash?: string;

	/**
	 * Audience(s) that this ID Token is intended for.
	 *
	 * > It MUST contain the OAuth 2.0 client_id of the Relying Party as an audience value.
	 * It MAY also contain identifiers for other audiences.
	 * In the general case, the aud value is an array of case sensitive strings.
	 * In the special case when there is one audience, the aud value MAY be a single case sensitive string.
	 */
	aud: string;

	/**
	 * Time when the End-User authentication occurred.
	 *
	 * > The time is represented as the number of seconds from `1970-01-01T0:0:0Z`
	 * as measured in UTC until the date/time. When a max_age
	 * request is made then this Claim is REQUIRED. The auth_time value is a
	 * number.
	 */
	auth_time?: string;

	/**
	 * Authorized Party - the party to which the ID Token was issued.
	 *
	 * > If present, it MUST contain the OAuth 2.0 client_id of the party that
	 * will be using it. This Claim is only REQUIRED when the party
	 * requesting the ID Token is not the same as the sole audience of the ID
	 * Token. It MAY be included even when the Authorized Party is the same
	 * as the sole audience. The azp value is a case sensitive string
	 * containing a StringOrURI value.
	 */
	azp?: string;

	/**
	 * Expiration time on or after which the ID Token MUST NOT be accepted for processing.
	 *
	 * > The processing of this parameter requires that the current date / time MUST be before the
	 * expiration date / time listed in the value.Implementers MAY provide for some small leeway,
	 * usually no more than a few minutes, to account for clock skew.The time is represented as
	 * the number of seconds from 1970 - 01 - 01T0: 0: 0Z as measured in UTC until the date / time.
	 * See RFC 3339[RFC3339] for details regarding date / times in general and UTC in particular.
	 * The exp value is a number.
	 */
	exp: number;

	/**
	 * Time at which the JWT was issued.
	 *
	 * > The time is represented as the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until
	 * the date / time. The iat value is a number.
	 */
	iat: number;

	/**
	 * Issuer.
	 *
	 * > Identifier for the Issuer of the response. The iss value is a case sensitive URL using the
	 * https scheme that contains scheme, host, and OPTIONALLY, port number and path components
	 * and no query or fragment components.
	 */
	iss: string;

	/**
	 * String value used to associate a Client session with an ID Token, and to mitigate replay attacks.
	 *
	 * > The value is passed through unmodified from the Authorization
	 * Request to the ID Token. The Client MUST verify that the nonce Claim
	 * Value is equal to the value of the nonce parameter sent in the
	 * Authorization Request. If present in the Authorization Request,
	 * Authorization Servers MUST include a nonce Claim in the ID Token
	 * with the Claim Value being the nonce value sent in the Authorization
	 * Request. Use of the nonce is OPTIONAL when using the code flow.
	 * The nonce value is a case sensitive string.
	 */
	nonce?: string;

	/**
	 * Subject identifier.
	 *
	 * > A locally unique and never reassigned identifier within the Issuer for
	 * the End-User, which is intended to be consumed by the Client, e.g.,
	 * `24400320` or `AItOawmwtWwcT0k51BayewNvutrJUqsvl6qs7A4`.It
	 * MUST NOT exceed 255 ASCII characters in length.
	 * The sub value is a case sensitive string.
	 */
	sub: string;

}

/**
 * Standard set of claims returned in a userinfo request.
 *
 * The standard claims conform to the [OpenID specification](http://openid.net/specs/openid-connect-basic-1_0-28.html#StandardClaims).
 */
export interface OpenIDTokenWithStandardClaims extends OpenIDToken {

	/**
	 * End-User's full name in displayable form including all name parts, possibly including
	 * titles and suffixes, ordered according to the End-User's locale and preferences.
	 */
	name: string;

	/**
	 * Given name(s) or first name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple given names; all can be present,
	 * with the names being separated by space characters.
	 */
	given_name?: string;

	/**
	 * Surname(s) or last name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple family names or no family name;
	 * all can be present, with the names being separated by space characters.
	 */
	family_name?: string;

	/**
	 * Middle name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple middle names; all can be present,
	 * with the names being separated by space characters. Also note that in some cultures,
	 * middle names are not used.
	 */
	middle_name?: string;

	/**
	 * Casual name of the End-User that may or may not be the same as the given_name.
	 * For instance, a nickname value of Mike might be returned alongside a given_name value of Michael.
	 */
	nickname: string;

	/**
	 * The organization ID.
	 */
	organization_id?: string;

	/**
	 * Shorthand name that the End-User wishes to be referred to at the RP, such as janedoe or j.doe.
	 * This value MAY be any valid JSON string including special characters such as @, /, or whitespace.
	 * This value MUST NOT be relied upon to be unique by the RP.
	 */
	preferred_username: string;

	/**
	 * URL of the End-User's profile page.
	 *
	 * The contents of this Web page SHOULD be about the End-User.
	 */
	profile: string;

	/**
	 * URL of the End-User's profile picture.
	 *
	 * This URL MUST refer to an image file (for example, a PNG, JPEG, or GIF image file),
	 * rather than to a Web page containing an image. Note that this URL SHOULD specifically
	 * reference a profile photo of the End-User suitable for displaying when describing
	 * the End-User, rather than an arbitrary photo taken by the End-User.
	 */
	picture: string;

	/**
	 * URL of the End-User's Web page or blog.
	 *
	 * This Web page SHOULD contain information published by the End-User or an organization that the End-User is affiliated with.
	 */
	website: string;

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
	 * End-User's gender.
	 *
	 * Values defined by this specification are female and male.
	 * Other values MAY be used when neither of the defined values are applicable.
	 */
	gender: string;

	/**
	 * End-User's birthday, represented as an ISO 8601:2004 [ISO8601‑2004] YYYY-MM-DD format.
	 * The year MAY be 0000, indicating that it is omitted.
	 * To represent only the year, YYYY format is allowed.
	 * Note that depending on the underlying platform's date related function, providing just year
	 * can result in varying month and day, so the implementers need to take this factor into account
	 * to correctly process the dates.
	 */
	birthdate: string;

	/**
	 * String from zoneinfo [zoneinfo] time zone database representing the End-User's time zone.
	 * For example, Europe/Paris or America/Los_Angeles.
	 */
	zoneinfo: string;

	/**
	 * End-User's locale, represented as a BCP47 [RFC5646] language tag.
	 *
	 * This is typically an ISO 639-1 Alpha-2 [ISO639‑1] language code in lowercase and an
	 * ISO 3166-1 Alpha-2 [ISO3166‑1] country code in uppercase, separated by a dash.
	 * For example, en-US or fr-CA. As a compatibility note, some implementations
	 * have used an underscore as the separator rather than a dash, for example, en_US;
	 * Implementations MAY choose to accept this locale syntax as well.
	 */
	locale: string;

	/**
	 * End-User's preferred telephone number.
	 *
	 * E.164 [E.164] is RECOMMENDED as the format of this Claim, for example, +1 (425) 555-1212 or +56 (2) 687 2400.
	 * If the phone number contains an extension, it is RECOMMENDED that the extension be represented using
	 * the RFC 3966 [RFC3966] extension syntax, for example, +1 (604) 555-1234;ext=5678.
	 */
	phone_number: string;

	/**
	 * True if the End-User's phone number has been verified; otherwise false.
	 *
	 * When this Claim Value is true, this means that the OP took affirmative steps to ensure that this phone number
	 * was controlled by the End-User at the time the verification was performed.
	 * The means by which a phone number is verified is context-specific, and dependent upon the trust framework or
	 * contractual agreements within which the parties are operating. When true, the phone_number
	 * Claim MUST be in E.164 format and any extensions MUST be represented in RFC 3966 format.
	 */
	phone_number_verified: boolean;

	/**
	 * End-User's preferred address.
	 *
	 * The value of the address member is a JSON [RFC4627] structure containing
	 * some or all of the members defined in Section 2.5.1.
	 */
	address: string;

	/**
	 * Time the End-User's information was last updated.
	 *
	 * The time is represented as the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
	 */
	updated_at: number;

}

export interface User {
	organizationId?: string;
	username: string;
}

export interface UserInfo {
	id: string;
	organizationId: string;
	url: string;
}

export interface Grant {
	accessToken: string;
	instanceUrl?: string;
	userInfo?: UserInfo;
}
