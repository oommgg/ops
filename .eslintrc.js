module.exports = {
    root: true,
    parserOptions: {
        parser: 'babel-eslint',
        sourceType: 'module'
    },
    env: {
        browser: true,
        node: true
    },
    extends: ['standard', 'plugin:vue/recommended', 'plugin:prettier/recommended'],
    globals: {
        __static: true
    },
    // plugins: [
    //   'html'
    // ],
    plugins: [/* 'html', */ 'vue', 'prettier'],
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'off',
        'vue/max-attributes-per-line': 'off',
        'vue/html-indent': [
            'error',
            4,
            {
                attribute: 1,
                closeBracket: 1,
                alignAttributesVertically: false,
                ignores: []
            }
        ],
        'vue/attributes-order': 'off'
        // allow paren-less arrow functions
        // 'arrow-parens': 0,
        // // allow async-await
        // 'generator-star-spacing': 0,
        // // allow debugger during development
        // 'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
    }
}
