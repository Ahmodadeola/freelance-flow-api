
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
        url: process.env.DATABASE_URL
    }
})