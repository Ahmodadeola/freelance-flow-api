import { ConfigFactory } from "@nestjs/config";
import { config, dev, prod, test } from "config";


export default () => {
    const configs: Array<ConfigFactory> = [config]

    switch (process.env.NODE_ENV) {
        case 'development':
            configs.push(dev)
            break;
        case 'production':
            configs.push(prod)
            break;
        case 'test':
            configs.push(test)
        default:
    }

    return configs
}