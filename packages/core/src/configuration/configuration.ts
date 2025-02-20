import * as fs from 'fs';
import * as path from 'path';
import {Schema} from "ajv";

export default () => {
    const schemasDir = path.join(__dirname, 'schemas');
    const schemaFiles = fs.readdirSync(schemasDir).filter(file => file.endsWith('schema.json'));

    const schemas: Schema[] = [];
    let mainSchema: Schema | undefined;

    for (const file of schemaFiles) {
        const filePath = path.join(schemasDir, file);
        // const key = file.replace('.schema.json', ''); // Use filename (without extension) as key
        const schema = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // console.log(schema)
        if (schema['$id'] === 'https://loopstack.ai/schemas/main.schema.json') {
            mainSchema = schema;
            continue;
        }
        schemas.push(schema);
    }

    return { mainSchema, schemas };
};
