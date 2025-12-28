const { DB_PROVIDER, DB_USER, DB_PASSWORD, DB_PORT, DB_HOST, TEST_DB_NAME } = process.env

export default () => ({
    database: {
        url: `${DB_PROVIDER}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}`,
    }
})