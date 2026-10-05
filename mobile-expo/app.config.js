// Keep tester installs separate from the original APK and its signing key.
module.exports = ({ config }) => {
  const testing = process.env.APP_VARIANT === 'testing';
  return {
    ...config,
    name: testing ? 'Shopora Test' : config.name,
    scheme: testing ? 'shopora-test' : config.scheme,
    android: {
      ...config.android,
      package: testing ? 'com.makatechlimited.shopora.testing' : config.android.package,
    },
  };
};
