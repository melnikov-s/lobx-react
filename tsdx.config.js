module.exports = {
    rollup(config) {
        return {
            ...config,
            output: {
                ...config.output,
                globals: {
                    react: "React",
                    lobx: "lobx"
                }
            }
        }
    }
}
