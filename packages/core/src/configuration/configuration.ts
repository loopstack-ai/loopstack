import { loadLoopstackSchemas } from '@loopstack/shared';

export default () => {
    const schemasConfig = loadLoopstackSchemas();
    return { ...schemasConfig };
};
