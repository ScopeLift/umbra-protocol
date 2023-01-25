/**
 * The inlang config is the entry point for every inlang app. 
 * 
 * More information about the config is available here 
 * https://inlang.com/documentation/config
 */
export async function initializeConfig(env) {
    // importing inlang-plugin-json from https://github.com/samuelstroschein/inlang-plugin-json
	const plugin = await env.$import(
		"https://cdn.jsdelivr.net/gh/samuelstroschein/inlang-plugin-json@1.0.0/dist/index.js"
	);

	const pluginConfig = {
		pathPattern: "./frontend/src/i18n/locales/{language}.json",
	};

	return {
		referenceLanguage: "en-us",
		languages: [
			"en-us",
			"zh-cn",
			
		],
		readResources: (args) => {
			return plugin.readResources({ ...args, ...env, pluginConfig });
		},
		writeResources: (args) => {
			return plugin.writeResources({ ...args, ...env, pluginConfig });
		},
	};
}