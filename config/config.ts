const { DB_PROVIDER, DB_USER, DB_PASSWORD, DB_PORT, DB_HOST, DB_NAME } = process.env
export default () => ({
    jwt: {
        accessTokenSecret: process.env.JWT_SECRET,
        refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
        accessTokenExpiresIn: 5 * 60,
        refreshTokenExpiresIn: 24 * 60 * 60
    },
    http: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
    },
    database: {
        url: `${DB_PROVIDER}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
    }
})