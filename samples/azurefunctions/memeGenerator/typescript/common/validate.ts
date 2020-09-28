export const validateEnvironment = function (variableName) {
    if (!process.env[variableName]) {
        throw new Error(`The environment variable '${variableName}' is missing or empty. Add to local.settings.json or App Settings.`);
    }
}