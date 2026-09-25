const isNode = typeof window === 'undefined';

const isClearAccessTokenRequested = () =>
	!isNode && new URLSearchParams(window.location.search).get("clear_access_token") === 'true';

const clearStoredAccessToken = () => {
	window.localStorage.removeItem('base44_access_token');
	window.localStorage.removeItem('token');
}

const getStoredAccessToken = () => {
	if (isNode) return undefined;
	try {
		return window.localStorage.getItem('base44_access_token') || undefined;
	} catch {
		return undefined;
	}
}

const getAppParams = () => {
	if (isClearAccessTokenRequested()) {
		clearStoredAccessToken();
	}
	return {
		appId: 'local',
		token: getStoredAccessToken(),
		functionsVersion: undefined,
		appBaseUrl: undefined,
	}
}


export const appParams = {
	...getAppParams()
}
