declare module 'openid-client' {

	interface Constructable<T> {
		new(): T;
	}

	export class Issuer {

		public authorization_endpoint: string;
		public token_endpoint: string;

		public static defaultHttpOptions: {
			timeout: number;
		};

		public static discover: (openidIssuerUri: string) => Promise<Issuer>;

		public grant: () => string;

		public Client: Constructable<Client>;

	}

	export class Client {

		public id_token_signed_response_alg: string;

		constructor(options: any);

		public grant({ grant_type, assertion }: { grant_type: string, assertion: string }): Promise<OpenIdGrant>;

		public userinfo(accessToken: string, options?: any): Promise<UserInfo>;

	}

	interface OpenIdGrant {
		instance_url: string,
		access_token: string
	}

	interface UserInfo {
		preferred_username: string;
		organization_id: string;
	}

}
