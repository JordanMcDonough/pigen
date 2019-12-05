module.exports = {
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
  },
  plugins: [
    "babel",
    "import"
  ],
  env: {
    "node": true,
    "es6": true
  },
  extends: [
    "eslint:recommended"
  ],
  settings: {
    "import/resolver": {
      "babel-module": {}
    }
  }
}